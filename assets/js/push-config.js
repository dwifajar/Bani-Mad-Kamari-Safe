/* BANI MAD KAMARI — Web Push configuration V14.47
   Public-only configuration. NEVER place the VAPID private key here.
*/
window.BMK_PUSH_CONFIG = Object.assign({
  functionPath: '/functions/v1/push-public-key',
  registerRpc: 'register_push_subscription'
}, window.BMK_PUSH_CONFIG || {});
