import {createContext,useContext,useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import type {Session} from '@supabase/supabase-js';
import {useQueryClient} from '@tanstack/react-query';
import {supabase} from '../../services/client';
import type {Profile} from '../../types/domain';
const Context=createContext<{session:Session|null;profile:Profile|null;loading:boolean}>({session:null,profile:null,loading:true});
export function AuthProvider({children}:{children:ReactNode}){
 const cache=useQueryClient();
 const [session,setSession]=useState<Session|null>(null),[profile,setProfile]=useState<Profile|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{
  if(!supabase){setLoading(false);return;}
  let active=true,generation=0,previousUser:string|null=null;
  const client=supabase;
  async function load(next:Session|null){
   if(!active)return;
   const current=++generation,user=next?.user.id??null;
   if(previousUser!==user){cache.clear();previousUser=user;}
   setSession(next);setProfile(null);setLoading(true);
   try{
    if(next){const {data,error}=await client.from('profiles').select('id,organization_id,department_id,role,display_name,is_active').eq('id',next.user.id).single();if(!error&&active&&generation===current)setProfile(data);}
   }catch{if(active&&generation===current)setProfile(null);}finally{if(active&&generation===current)setLoading(false);}
  }
  void client.auth.getSession().then(({data})=>load(data.session)).catch(()=>{if(active)setLoading(false);});
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,next)=>{window.setTimeout(()=>void load(next),0);});
  return()=>{active=false;generation++;subscription.unsubscribe();};
 },[cache]);
 return <Context.Provider value={{session,profile,loading}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
