import { enviar, rota } from "../lib/http.js";
import { cookieSair } from "../lib/auth.js";

export default rota(["POST"], async (req, res) => enviar(res, 200, { ok: true }, { "Set-Cookie": cookieSair(req) }));
