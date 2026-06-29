export default function authorizeRole(rolesPermitidas) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    if (!rolesPermitidas.includes(req.usuario.role)) {
      return res.status(403).json({ 
        error: "Acesso negado. Permissão insuficiente." 
      });
    }

    next();
  };
}
