'use strict';

(function (workspace, readConfig) {
    const csd = new CSD();

    workspace.windowAdded.connect(function (window) {
        if (window) {
            csd.add(window);
        }
    });

    workspace.windowActivated.connect(function (window) {
        if (window) {
            csd.activate(window);
        }
    });

    workspace.windowRemoved.connect(function (window) {
        if (window) {
            csd.remove(window);
        }
    });

    // Plasma 6: windowMaximizeSet passes (window, horizontal, vertical)
    workspace.windowMaximizeSet.connect(function (window) {
        if (window && csd.add(window)) {
            window.noBorder = false;
        }
    });

    function CSD() {
        const windows = new WindowSet();
        const pending = new WindowSet();
        // Store per-window handlers so we can disconnect cleanly
        const handlers = new Map();

        this.add = function (window) {
            if (windows.add(window)) {
                logWindow(window, 'added');

                pending.add(window);

                const handler = function () { activateWindow(window); };
                handlers.set(window, handler);
                window.windowShown.connect(handler);
            }

            return windows.has(window);
        };

        this.activate = function (window) {
            if (pending.has(window)) {
                logWindow(window, 'activating...');

                window.setMaximize(true, true);
            }
        };

        this.remove = function (window) {
            if (windows.remove(window)) {
                logWindow(window, 'removed');

                pending.remove(window);
                disconnectHandler(window);
            }
        };

        function activateWindow(window) {
            if (pending.has(window)) {
                logWindow(window, 'activated');

                pending.remove(window);
                disconnectHandler(window);
                window.setMaximize(false, false);
            }
        }

        function disconnectHandler(window) {
            const handler = handlers.get(window);
            if (handler) {
                window.windowShown.disconnect(handler);
                handlers.delete(window);
            }
        }
    }

    function WindowSet() {
        const windows = [];
        const specialResourceClasses = ['plasmashell', 'lattedock', 'firefox'];

        this.has = function (window) {
            return windows.indexOf(window) !== -1;
        };

        this.add = function (window) {
            if (this.has(window)) {
                return false;
            }

            if (!windowIsDecoratable(window)) {
                return false;
            }

            windows.push(window);

            return true;
        };

        this.remove = function (window) {
            const index = windows.indexOf(window);

            if (index === -1) {
                return false;
            }

            windows.splice(index, 1);

            return true;
        };

        // @see https://techbase.kde.org/Projects/KWin/Window_Decoration_Policy
        function windowIsDecoratable(window) {
            if (specialResourceClasses.indexOf(window.resourceClass) !== -1) {
                return false;
            }

            if (!window.managed) {
                return false;
            }

            // Plasma 6: use boolean window-type properties instead of windowType integer
            const shouldNotDecorate = [
                window.fullScreen,
                window.keepAbove && window.shaped,
                window.specialWindow,
                window.isDesktop,
                window.isDock,
                window.isSplash,
                window.isDropdownMenu,
                window.isPopupMenu,
                window.isTooltip,
                window.isNotification,
                window.isComboBox,
                window.isDNDIcon,
                window.isCriticalNotification,
                window.isAppletPopup,
                window.isPopupWindow,
            ].indexOf(true);

            if (shouldNotDecorate !== -1) {
                return false;
            }

            return window.clientSideDecorated
                && window.noBorder;
        }
    }

    function logWindow(window, context) {
        if (!readConfig('isDebugging', false)) {
            return;
        }

        console.debug(JSON.stringify({
            isActive: workspace.activeWindow === window,
            resourceClass: window.resourceClass,
            clientSideDecorated: window.clientSideDecorated,
            noBorder: window.noBorder,
            maximizable: window.maximizable,
            context: context,
        }));
    }
}(workspace, readConfig));
