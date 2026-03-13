import axios from "redaxios";
import { envVariables } from "./env";

export const api = axios.create({
  baseURL: envVariables.VITE_API_BASE_URL,
})