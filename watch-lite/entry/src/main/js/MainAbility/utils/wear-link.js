/* FitKoçum Watch Lite: Huawei Wear Engine transport adapter.
 * This is intentionally dependency-injected: the licensed Huawei
 * wearengine.js SDK must be supplied by the developer in DevEco Studio.
 * NO credentials or Bluetooth connection exist by default.
 *
 * Matches the SDK's P2pClient / Message / Builder pattern used in the
 * Huawei sample sportwatch-wear-engine-lite-wearable-to-mobile.
 */
export default function createWearLink(api,peer,onPacket,onStatus){
 if(!api||typeof api.P2pClient!=='function'||typeof api.Message!=='function'
   ||typeof api.Builder!=='function')throw Error('Huawei Wear Engine Lite SDK missing');
 if(!peer||typeof peer.packageName!=='string'||!peer.packageName
   ||typeof peer.fingerprint!=='string'||!peer.fingerprint)throw Error('Peer app credentials not configured');
 const client=new api.P2pClient();
 const info=typeof onStatus==='function'?onStatus:function(){};
 const consume=typeof onPacket==='function'?onPacket:function(){};
 client.setPeerPkgName(peer.packageName);
 client.setPeerFingerPrint(peer.fingerprint);
 let started=false;
 return {
  start(){
   if(started)return;
   client.registerReceiver({
    onSuccess(){info('ready')},
    onFailure(){info('receiver-failed')},
    onReceiveMessage(data){
     if(!data||data.isFileType||typeof data.data!=='string'||data.data.length>4096)return;
     try{
       const packet=JSON.parse(data.data);
       if(packet&&packet.v===1&&typeof packet.messageId==='string')consume(packet);
     }catch(e){info('invalid-message')}
    }
   });
   started=true;
  },
  send(packet){
   if(!started)throw Error('Receiver not registered');
   if(!packet||packet.v!==1||!packet.messageId)throw Error('Invalid packet');
   const builder=new api.Builder(),message=new api.Message();
   // The SDK sample uses Builder.setDescription for text messages.
   builder.setDescription(JSON.stringify(packet));
   message.builder=builder;
   client.send(message,{
    onSuccess(){info('send-started')},
    onFailure(){info('send-failed')},
    onSendResult(result){info(result&&result.code===207?'delivered':'delivery-unknown')},
    onSendProgress(){}
   });
  },
  stop(){
   if(!started)return;
   client.unregisterReceiver({onSuccess(){info('stopped')},onFailure(){info('stop-failed')}});
   started=false;
  }
 };
}
