export const parseCalldate = (dateStr) => {
    if (!dateStr) return new Date();
    // Si la fecha viene con Z (UTC), se la quitamos para que el navegador
    // la interprete como fecha local 'naive' (tal como viene en la BD)
    if (typeof dateStr === 'string' && dateStr.endsWith('Z')) {
        return new Date(dateStr.slice(0, -1));
    }
    return new Date(dateStr);
};
