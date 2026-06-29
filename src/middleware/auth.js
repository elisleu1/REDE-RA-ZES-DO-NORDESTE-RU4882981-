import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config(); // carrega variáveis do .env

const SECRET = process.env.JWT_SECRET;

export default function autenticarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token inválido" });
  }
}
