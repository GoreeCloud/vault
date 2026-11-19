import {parse} from 'tldts';
import {makePasskeyRpPolicy} from './passkey_rp_core';

// Parse against the web app's own pinned PSL dependency.
export const {normalizePasskeyRpId,isPasskeyRpBoundToOrigin} =
  makePasskeyRpPolicy(input=>parse(input,{allowPrivateDomains:true,extractHostname:false}));
