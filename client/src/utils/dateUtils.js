export const parseCalldate = (dateStr) => {
    if (!dateStr) return new Date();
    return new Date(dateStr);
};
