// errors.js - error handling placeholder

export const notFound = (req, res) => {
  res.status(404).render("error", { error: "Page not found" });
};
