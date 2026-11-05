import { enviar, rota } from "../lib/http.js";

export default rota(["GET"], async (req, res) => enviar(res, 200, {
  linkCompra: process.env.LINK_COMPRA || "#",
  suporte: process.env.SUPORTE_EMAIL || ""
}));
