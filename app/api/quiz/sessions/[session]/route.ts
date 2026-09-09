import {getDatabase} from '@/db';import {SessionStore} from '@/server/session-store';import {handle,owner,json,sameOrigin,readJson,HttpError} from '@/server/http';
type Context={params:Promise<{session:string}>};
export const dynamic='force-dynamic';
export function GET(_request:Request,{params}:Context){return handle(async()=>{const who=await owner();return json(await new SessionStore(getDatabase()).current((await params).session,who));});}
export function PATCH(request:Request,{params}:Context){return handle(async()=>{sameOrigin(request);const who=await owner(),body=await readJson(request),id=(await params).session;
 if(typeof body.questionId!=='string'||typeof body.answer!=='string')throw new HttpError(400,'Question and answer required.');
 const store=new SessionStore(getDatabase());if(body.action==='draft'){if(typeof body.revision!=='number')throw new HttpError(400,'Draft revision required.');return json(await store.draft(id,who,body.questionId,body.answer,body.revision));}
 if(body.action!=='submit'||typeof body.key!=='string'||(body.skipConfirmed!==undefined&&typeof body.skipConfirmed!=='boolean'))throw new HttpError(400,'Invalid submission.');
 return json(await store.submit(id,who,body.questionId,body.answer,body.key,body.skipConfirmed===true));
 });}
export function DELETE(request:Request,{params}:Context){return handle(async()=>{sameOrigin(request);const who=await owner();return json(await new SessionStore(getDatabase()).remove((await params).session,who));});}
