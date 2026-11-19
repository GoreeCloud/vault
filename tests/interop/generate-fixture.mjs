/** Synthetic test-only material; stable PBKDF2 + AES-GCM interoperability fixture. */
import { pbkdf2Sync, createCipheriv } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const salt = Buffer.from('000102030405060708090a0b0c0d0e0f','hex');
const nonce = Buffer.from('101112131415161718191a1b','hex');
const key = pbkdf2Sync('interop test password only',salt,600000,32,'sha256');
const clear = Buffer.from(JSON.stringify({version:1,entries:[
  {id:'interop-1',title:'Synthetic item',username:'fake-account',password:'NOT-A-REAL-PASSWORD',
    website:'example.invalid',notes:'test only',kind:'login',favorite:true,tags:['synthetic'],
    customFields:[{name:'Synthetic key',value:'NOT-A-REAL-SECRET',concealed:true}],
    otp:{type:'totp',secret:'JBSWY3DPEHPK3PXP',algorithm:'SHA1',digits:6,period:30,
      counter:0,issuer:'Example',account:'fake-account'}},
  {id:'interop-note',title:'Private test note',username:'',password:'',website:'',
    notes:'SYNTHETIC NOTE ONLY',kind:'note',favorite:false,tags:['test'],customFields:[]},
  {id:'interop-passkey',title:'Passkey placeholder',username:'',password:'',website:'',
    notes:'Reference only',kind:'passkey',
    passkey:{rpId:'example.invalid',credentialId:'',userHandle:''}}
]}));
const cipher = createCipheriv('aes-256-gcm',key,nonce);
const sealed = Buffer.concat([cipher.update(clear),cipher.final(),cipher.getAuthTag()]);
const envelope={
  format:'goreecloud-vault',version:1,
  kdf:{name:'pbkdf2-sha256',iterations:600000,salt:salt.toString('base64')},
  cipher:{name:'aes-256-gcm',nonce:nonce.toString('base64'),data:sealed.toString('base64')}
};
writeFileSync(new URL('sample-v1.json',import.meta.url),JSON.stringify(envelope,null,2)+'\n');
