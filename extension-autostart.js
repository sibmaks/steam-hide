(function () {
    const start = () => {
        if (!window.SteamHider || typeof window.SteamHider.start !== 'function') {
            return false;
        }

        window.SteamHider.start();
        return true;
    };

    if (start()) return;

    const intervalId = setInterval(() => {
        if (start()) {
            clearInterval(intervalId);
        }
    }, 250);

    setTimeout(() => clearInterval(intervalId), 10000);
})();
