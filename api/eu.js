import { enviar, rota } from "../lib/http.js";
import { exigirUsuario } from "../lib/auth.js";

export default rota(["GET"], async (req, res) => {
  const u = await exigirUsuario(req);
  enviar(res, 200, { email: u.email });
});
