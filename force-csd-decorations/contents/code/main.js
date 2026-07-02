'use strict';

(function (workspace, readConfig) {
    const pending = new WindowSet();
    const decorateHandlers = new Map();

    workspace.windowAdded.connect(function (window) {
        if (window && isDecoratable(window)) {
            logWindow(window, 'added');
            pending.add(window);
        }
    });

    workspace.windowActivated.connect(function (window) {
        if (!window || !pending.has(window)) {
            return;
        }

        logWindow(window, 'activating');
        pending.remove(window);

        if (!window.maximizable) {
            return;
        }

        // Trigger a maximize→restore cycle so KWin re-evaluates and applies decoration.
        // workspace.windowMaximizeSet does not exist in Plasma 6; we use a one-shot
        // maximizedChanged connection on the window itself instead.
        const onMaximized = function () {
            window.maximizedChanged.disconnect(onMaximized);
            decorateHandlers.delete(window);
            window.setMaximize(false, false);
        };
        decorateHandlers.set(window, onMaximized);
        window.maximizedChanged.connect(onMaximized);
        window.setMaximize(true, true);
    });

    workspace.windowRemoved.connect(function (window) {
        if (!window) {
            return;
        }

        pending.remove(window);

        // Clean up any dangling one-shot handler
        const handler = decorateHandlers.get(window);
        if (handler) {
            window.maximizedChanged.disconnect(handler);
            decorateHandlers.delete(window);
        }
    });

    // -------------------------------------------------------------------------

    function WindowSet() {
        const windows = [];

        this.has = function (window) {
            return windows.indexOf(window) !== -1;
        };

        this.add = function (window) {
            if (!this.has(window)) {
                windows.push(window);
            }
        };

        this.remove = function (window) {
            const index = windows.indexOf(window);
            if (index !== -1) {
                windows.splice(index, 1);
            }
        };
    }

    // Resource classes that should never receive forced decoration
    const SKIP_CLASSES = ['plasmashell', 'lattedock', 'firefox'];

    // @see https://techbase.kde.org/Projects/KWin/Window_Decoration_Policy
    function isDecoratable(window) {
        if (SKIP_CLASSES.indexOf(window.resourceClass) !== -1) {
            return false;
        }

        if (!window.managed) {
            return false;
        }

        // Q_PROPERTY names in Plasma 6 window.h (not the is* C++ method names)
        const isSpecialType = [
            window.fullScreen,
            window.specialWindow,
            window.desktopWindow,  // Q_PROPERTY: desktopWindow, READ isDesktop
            window.dock,           // Q_PROPERTY: dock,          READ isDock
            window.splash,
            window.dropdownMenu,
            window.popupMenu,
            window.tooltip,
            window.notification,
            window.comboBox,
            window.dndIcon,
            window.criticalNotification,
            window.appletPopup,
            window.popupWindow,
        ].indexOf(true) !== -1;

        if (isSpecialType) {
            return false;
        }

        // clientSideDecorated is not exposed in the Plasma 6 scripting API;
        // noBorder is the reliable proxy: CSD windows have no server-side border.
        return window.noBorder;
    }

    function logWindow(window, context) {
        if (!readConfig('isDebugging', false)) {
            return;
        }

        console.debug(JSON.stringify({
            isActive: workspace.activeWindow === window,
            resourceClass: window.resourceClass,
            noBorder: window.noBorder,
            maximizable: window.maximizable,
            context: context,
        }));
    }
}(workspace, readConfig));
