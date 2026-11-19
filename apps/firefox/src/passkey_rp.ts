import {parse} from 'tldts';
import {makePasskeyRpPolicy} from '../../web/src/passkey_rp_core';

// Resolve PSL data from the Firefox extension's *own* production dependencies.
export const {normalizePasskeyRpId,isPasskeyRpBoundToOrigin} =
  makePasskeyRpPolicy(input=>parse(input,{allowPrivateDomains:true,extractHostname:false}));
