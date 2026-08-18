/** IP of the current login attempt (set by loginAction / auth route before signIn). */
let pendingIp = "unknown";

export function setLoginRequestIp(ip: string) {
  pendingIp = ip.trim() || "unknown";
}

export function takeLoginRequestIp() {
  const ip = pendingIp;
  pendingIp = "unknown";
  return ip;
}
