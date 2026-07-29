"use client";

import { ccc } from "@ckb-ccc/connector-react";
import { buildCccClient, readEnvNetwork } from "./ccc-client";

/**
 * WebComponentConnector (the Lit element @ckb-ccc/connector-react wraps) hardcodes
 * `this.client = new ccc.ClientPublicTestnet()` in its constructor and auto-reconnects any
 * wallet saved in localStorage inside connectedCallback() — which runs synchronously during
 * React's commit phase, strictly before any useEffect (including our own NetworkSync's
 * setClient() call in providers.tsx) can run. There is no Provider prop that configures the
 * client early enough to avoid this: defaultClient/clientOptions/signerFilter/preferredNetworks
 * were all checked against the actual @ckb-ccc/connector + @lit/react source, and every one of
 * them is applied via a useLayoutEffect, which unavoidably fires after connectedCallback.
 * Patching the prototype here — imported once, before CccProvider ever mounts — is the only way
 * to make the very first auto-reconnect see the correct network.
 *
 * Fragile by nature: if @ckb-ccc/connector-react changes connectedCallback's implementation or
 * removes/renames `client`, this silently stops helping (falls back to the pre-patch behavior,
 * doesn't throw). Re-verify this file against the installed version after any
 * @ckb-ccc/connector-react upgrade.
 */
const originalConnectedCallback = ccc.WebComponentConnector.prototype.connectedCallback;
ccc.WebComponentConnector.prototype.connectedCallback = function (
  this: InstanceType<typeof ccc.WebComponentConnector>
) {
  this.client = buildCccClient(readEnvNetwork());
  originalConnectedCallback.call(this);
};
