mod database;

use database::{Database, CreateTodoInput, UpdateTodoInput, TodoFilter, Todo};
use log::info;
use tauri::{AppHandle, Manager, State};

#[cfg(desktop)]
use tauri::{
    tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent},
    menu::{MenuBuilder, MenuItemBuilder},
    WindowEvent,
};

#[tauri::command]
fn get_all_todos(db: State<Database>, search: Option<String>, urgency: Option<i32>, status: Option<String>) -> Result<Vec<Todo>, String> {
    info!("get_all_todos: search={:?}, urgency={:?}, status={:?}", search, urgency, status);
    db.get_all_todos(TodoFilter { search, urgency, status })
}

#[tauri::command]
fn create_todo(db: State<Database>, input: CreateTodoInput) -> Result<Todo, String> {
    info!("create_todo: title={}", input.title);
    db.create_todo(input)
}

#[tauri::command]
fn update_todo(db: State<Database>, id: String, input: UpdateTodoInput) -> Result<Todo, String> {
    info!("update_todo: id={}", id);
    db.update_todo(&id, input)
}

#[tauri::command]
fn delete_todo(db: State<Database>, id: String) -> Result<(), String> {
    info!("delete_todo: id={}", id);
    db.delete_todo(&id)
}

#[tauri::command]
fn toggle_todo(db: State<Database>, id: String) -> Result<Todo, String> {
    info!("toggle_todo: id={}", id);
    db.toggle_todo(&id)
}

#[tauri::command]
fn get_setting(db: State<Database>, key: String) -> Result<Option<String>, String> {
    db.get_setting(&key)
}

#[tauri::command]
fn set_setting(db: State<Database>, key: String, value: String) -> Result<(), String> {
    db.set_setting(&key, &value)
}

#[cfg(desktop)]
#[tauri::command]
fn set_window_opacity(_app: AppHandle, _opacity: f64) -> Result<(), String> {
    Ok(())
}

#[cfg(desktop)]
#[tauri::command]
fn set_always_on_top(app: AppHandle, on_top: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.set_always_on_top(on_top).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(desktop)]
#[tauri::command]
fn minimize_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.minimize().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(desktop)]
#[tauri::command]
fn close_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(desktop)]
#[tauri::command]
fn start_dragging(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.start_dragging().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(desktop)]
#[tauri::command]
async fn check_update(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_updater::UpdaterExt;
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => {
            let version = update.version.clone();
            info!("Update found: {}", version);
            if let Err(e) = update.download_and_install(|_, _| {}, || {}).await {
                return Err(format!("Download failed: {}", e));
            }
            Ok(Some(version))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(desktop)]
#[tauri::command]
fn restart_app(app: AppHandle) -> Result<(), String> {
    app.restart();
}

#[cfg(desktop)]
fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItemBuilder::with_id("show", "显示/隐藏").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;
    let menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("TodoTool")
        .on_menu_event(move |app, event| {
            match event.id().as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("failed to get app data dir");
            let db = Database::new(app_data_dir)?;
            app.manage(db);

            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

            #[cfg(desktop)]
            {
                setup_tray(app.handle())?;

                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;

                let window = app.get_webview_window("main").unwrap();
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
            }

            info!("TodoTool starting up, data dir: {:?}", app.path().app_data_dir());
            Ok(())
        });

    #[cfg(desktop)]
    let builder = builder.invoke_handler(tauri::generate_handler![
        get_all_todos,
        create_todo,
        update_todo,
        delete_todo,
        toggle_todo,
        get_setting,
        set_setting,
        set_window_opacity,
        set_always_on_top,
        minimize_window,
        close_window,
        start_dragging,
        check_update,
        restart_app,
    ]);

    #[cfg(mobile)]
    let builder = builder.invoke_handler(tauri::generate_handler![
        get_all_todos,
        create_todo,
        update_todo,
        delete_todo,
        toggle_todo,
        get_setting,
        set_setting,
    ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
