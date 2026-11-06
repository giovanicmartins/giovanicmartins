import { enviar, lerJson, rota } from "../lib/http.js";
import { normEmail, emailValido } from "../lib/auth.js";
import { criarCheckout } from "../lib/mp.js";

// Cria o pagamento no Mercado Pago e devolve o link para onde o cliente vai
export default rota(["POST"], async (req, res) => {
  const { email: e } = await lerJson(req);
  const email = normEmail(e);
  if (!emailValido(email)) return enviar(res, 400, { erro: "Digite um e-mail válido." });
  const url = await criarCheckout(req, email);
  enviar(res, 200, { url });
});
