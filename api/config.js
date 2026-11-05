import { enviar, rota } from "../lib/http.js";
import { preco } from "../lib/mp.js";

export default rota(["GET"], async (req, res) => enviar(res, 200, {
  linkCompra: process.env.LINK_COMPRA || "/#preco",
  suporte: process.env.SUPORTE_EMAIL || "",
  preco: preco(),
  pagamentoAtivo: Boolean(process.env.MP_ACCESS_TOKEN)
}));
