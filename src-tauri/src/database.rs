use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub description: String,
    pub completed: bool,
    pub urgency: i32,
    pub due_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct CreateTodoInput {
    pub title: String,
    pub description: Option<String>,
    pub urgency: Option<i32>,
    pub due_date: Option<String>,
}

impl Default for CreateTodoInput {
    fn default() -> Self {
        Self {
            title: String::new(),
            description: None,
            urgency: None,
            due_date: None,
        }
    }
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct UpdateTodoInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub urgency: Option<i32>,
    pub due_date: Option<String>,
    pub completed: Option<bool>,
    pub completed_at: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct TodoFilter {
    pub search: Option<String>,
    pub urgency: Option<i32>,
    pub status: Option<String>,
    pub completed_date: Option<String>,
}

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_data_dir: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
        let db_path = app_data_dir.join("todos.db");
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS todos (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                completed INTEGER DEFAULT 0,
                urgency INTEGER DEFAULT 0,
                due_date TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                completed_at TEXT,
                sort_order INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );"
        ).map_err(|e| e.to_string())?;

        let has_completed_at: bool = conn
            .prepare("SELECT COUNT(*) FROM pragma_table_info('todos') WHERE name='completed_at'")
            .and_then(|mut s| s.query_row([], |r| r.get::<_, i32>(0)))
            .map(|c| c > 0)
            .unwrap_or(false);
        if !has_completed_at {
            conn.execute("ALTER TABLE todos ADD COLUMN completed_at TEXT", [])
                .map_err(|e| e.to_string())?;
        }

        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn get_all_todos(&self, filter: TodoFilter) -> Result<Vec<Todo>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut sql = String::from("SELECT id, title, description, completed, urgency, due_date, created_at, updated_at, completed_at, sort_order FROM todos WHERE 1=1");
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(ref search) = filter.search {
            if !search.is_empty() {
                sql.push_str(" AND (title LIKE ?1 OR description LIKE ?1)");
                param_values.push(Box::new(format!("%{}%", search)));
            }
        }
        if let Some(urgency) = filter.urgency {
            let idx = param_values.len() + 1;
            sql.push_str(&format!(" AND urgency = ?{}", idx));
            param_values.push(Box::new(urgency));
        }
        if let Some(ref status) = filter.status {
            match status.as_str() {
                "active" => sql.push_str(" AND completed = 0"),
                "completed" => sql.push_str(" AND completed = 1"),
                _ => {}
            }
        }
        if let Some(ref completed_date) = filter.completed_date {
            if !completed_date.is_empty() {
                let idx = param_values.len() + 1;
                sql.push_str(&format!(" AND date(completed_at) = ?{}", idx));
                param_values.push(Box::new(completed_date.clone()));
            }
        }

        sql.push_str(" ORDER BY created_at DESC");

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        let todos = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(Todo {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                completed: row.get::<_, i32>(3)? != 0,
                urgency: row.get(4)?,
                due_date: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                completed_at: row.get(8)?,
                sort_order: row.get(9)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut result = Vec::new();
        for todo in todos {
            result.push(todo.map_err(|e| e.to_string())?);
        }
        Ok(result)
    }

    pub fn create_todo(&self, input: CreateTodoInput) -> Result<Todo, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let description = input.description.unwrap_or_default();
        let urgency = input.urgency.unwrap_or(0);

        conn.execute(
            "INSERT INTO todos (id, title, description, completed, urgency, due_date, created_at, updated_at, completed_at, sort_order) VALUES (?1, ?2, ?3, 0, ?4, ?5, ?6, ?7, NULL, 0)",
            params![id, input.title, description, urgency, input.due_date, now, now],
        ).map_err(|e| e.to_string())?;

        Ok(Todo {
            id,
            title: input.title,
            description,
            completed: false,
            urgency,
            due_date: input.due_date,
            created_at: now.clone(),
            updated_at: now,
            completed_at: None,
            sort_order: 0,
        })
    }

    pub fn update_todo(&self, id: &str, input: UpdateTodoInput) -> Result<Todo, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = Utc::now().to_rfc3339();

        let mut sets = vec!["updated_at = ?1".to_string()];
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now.clone())];
        let mut idx = 2;

        if let Some(ref title) = input.title {
            sets.push(format!("title = ?{}", idx));
            param_values.push(Box::new(title.clone()));
            idx += 1;
        }
        if let Some(ref desc) = input.description {
            sets.push(format!("description = ?{}", idx));
            param_values.push(Box::new(desc.clone()));
            idx += 1;
        }
        if let Some(urgency) = input.urgency {
            sets.push(format!("urgency = ?{}", idx));
            param_values.push(Box::new(urgency));
            idx += 1;
        }
        if let Some(ref due_date) = input.due_date {
            sets.push(format!("due_date = ?{}", idx));
            param_values.push(Box::new(due_date.clone()));
            idx += 1;
        }
        if let Some(completed) = input.completed {
            sets.push(format!("completed = ?{}", idx));
            param_values.push(Box::new(completed as i32));
            idx += 1;
        }
        if let Some(ref completed_at) = input.completed_at {
            sets.push(format!("completed_at = ?{}", idx));
            param_values.push(Box::new(completed_at.clone()));
            idx += 1;
        }
        if let Some(sort_order) = input.sort_order {
            sets.push(format!("sort_order = ?{}", idx));
            param_values.push(Box::new(sort_order));
            idx += 1;
        }

        let sql = format!("UPDATE todos SET {} WHERE id = ?{}", sets.join(", "), idx);
        param_values.push(Box::new(id.to_string()));

        let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        conn.execute(&sql, params_refs.as_slice()).map_err(|e| e.to_string())?;

        let _ = idx;
        let todo = conn.query_row(
            "SELECT id, title, description, completed, urgency, due_date, created_at, updated_at, completed_at, sort_order FROM todos WHERE id = ?1",
            params![id],
            |row| {
                Ok(Todo {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    completed: row.get::<_, i32>(3)? != 0,
                    urgency: row.get(4)?,
                    due_date: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                    completed_at: row.get(8)?,
                    sort_order: row.get(9)?,
                })
            },
        ).map_err(|e| e.to_string())?;

        Ok(todo)
    }

    pub fn delete_todo(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM todos WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn toggle_todo(&self, id: &str) -> Result<Todo, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = Utc::now().to_rfc3339();

        let current_completed: i32 = conn.query_row(
            "SELECT completed FROM todos WHERE id = ?1",
            params![id],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        let new_completed = 1 - current_completed;
        let completed_at: Option<String> = if new_completed == 1 { Some(now.clone()) } else { None };

        conn.execute(
            "UPDATE todos SET completed = ?1, completed_at = ?2, updated_at = ?3 WHERE id = ?4",
            params![new_completed, completed_at, now, id],
        ).map_err(|e| e.to_string())?;

        let todo = conn.query_row(
            "SELECT id, title, description, completed, urgency, due_date, created_at, updated_at, completed_at, sort_order FROM todos WHERE id = ?1",
            params![id],
            |row| {
                Ok(Todo {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    completed: row.get::<_, i32>(3)? != 0,
                    urgency: row.get(4)?,
                    due_date: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                    completed_at: row.get(8)?,
                    sort_order: row.get(9)?,
                })
            },
        ).map_err(|e| e.to_string())?;

        Ok(todo)
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let result = conn.query_row(
            "SELECT value FROM app_settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        );
        match result {
            Ok(val) => Ok(Some(val)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }
}
