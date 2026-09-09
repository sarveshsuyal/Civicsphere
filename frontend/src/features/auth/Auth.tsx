import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/client';
import type { Profile, Role } from '../../types/domain';
import { authStore } from './authStore';
import type { ManagedUser, Permission } from './authStore';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  activeUser: ManagedUser | null;
  loading: boolean;
  isLiveBackend: boolean;
  permissions: Permission[];
  hasPerm: (permission: Permission) => boolean;
  switchProfile: (userId: string) => void;
  signInLocal: (email: string) => Promise<Profile>;
  registerLocal: (data: { display_name: string; email: string; role: Role; department_id: string | null }) => Promise<Profile>;
  signOut: () => Promise<void>;
}

const Context = createContext<AuthContextValue>({
  session: null,
  profile: null,
  activeUser: null,
  loading: true,
  isLiveBackend: false,
  permissions: [],
  hasPerm: () => false,
  switchProfile: () => {},
  signInLocal: async () => { throw new Error('Not initialized'); },
  registerLocal: async () => { throw new Error('Not initialized'); },
  signOut: async () => {},
});

function createMockSession(user: ManagedUser): Session {
  const mockUser: User = {
    id: user.id,
    app_metadata: { provider: 'civicsphere_local', providers: ['civicsphere_local'] },
    user_metadata: { display_name: user.display_name, role: user.role },
    aud: 'authenticated',
    confirmation_sent_at: '',
    recovery_sent_at: '',
    email_change_sent_at: '',
    new_email: '',
    invited_at: '',
    action_link: '',
    email: user.email,
    phone: '',
    created_at: user.created_at,
    confirmed_at: user.created_at,
    email_confirmed_at: user.created_at,
    phone_confirmed_at: '',
    last_sign_in_at: user.last_login_at,
    role: 'authenticated',
    updated_at: new Date().toISOString(),
    identities: [],
    factors: [],
  };

  return {
    access_token: 'civic_session_token_' + user.id,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'civic_refresh_token_' + user.id,
    user: mockUser,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeUser, setActiveUser] = useState<ManagedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiveBackend] = useState<boolean>(Boolean(supabase));

  // Sync profile & session from authStore
  const syncFromStore = () => {
    const user = authStore.getActiveUser();
    const prof = authStore.getActiveProfile();
    setActiveUser(user);
    setProfile(prof);
    setSession(createMockSession(user));
  };

  useEffect(() => {
    let active = true;

    if (supabase) {
      let generation = 0;
      let previousUser: string | null = null;
      const client = supabase;

      async function load(next: Session | null) {
        if (!active) return;
        const current = ++generation;
        const user = next?.user.id ?? null;
        if (previousUser !== user) {
          cache.clear();
          previousUser = user;
        }

        setSession(next);
        setLoading(true);

        try {
          if (next) {
            const { data, error } = await client
              .from('profiles')
              .select('id,organization_id,department_id,role,display_name,is_active')
              .eq('id', next.user.id)
              .single();

            if (!error && active && generation === current) {
              setProfile(data);
              setActiveUser({
                id: data.id,
                email: next.user.email || 'user@city.gov.in',
                display_name: data.display_name,
                role: data.role,
                department_id: data.department_id,
                department_name: 'Municipal Department',
                organization_id: data.organization_id,
                is_active: data.is_active,
                created_at: new Date().toISOString(),
                last_login_at: new Date().toISOString(),
                avatar_initials: data.display_name.slice(0, 2).toUpperCase(),
              });
            } else if (active && generation === current) {
              // Fallback to local profile if remote row not provisioned yet
              syncFromStore();
            }
          } else {
            // Check if local session preferred
            const savedLocal = localStorage.getItem('civicsphere_active_user_id');
            if (savedLocal) {
              syncFromStore();
            } else {
              setProfile(null);
              setActiveUser(null);
            }
          }
        } catch {
          if (active && generation === current) syncFromStore();
        } finally {
          if (active && generation === current) setLoading(false);
        }
      }

      void client.auth
        .getSession()
        .then(({ data }) => load(data.session))
        .catch(() => {
          if (active) {
            syncFromStore();
            setLoading(false);
          }
        });

      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, next) => {
        window.setTimeout(() => void load(next), 0);
      });

      return () => {
        active = false;
        generation++;
        subscription.unsubscribe();
      };
    } else {
      // Local Auth Mode: restore session from store
      try {
        syncFromStore();
      } finally {
        setLoading(false);
      }
    }
  }, [cache]);

  const switchProfile = (userId: string) => {
    cache.clear();
    const user = authStore.switchActiveUser(userId);
    setActiveUser(user);
    const prof = authStore.getActiveProfile();
    setProfile(prof);
    setSession(createMockSession(user));
  };

  const signInLocal = async (email: string): Promise<Profile> => {
    const users = authStore.getUsers();
    const found = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found) {
      throw new Error(`No account found for "${email}". You can sign in with a demo profile or create a new account.`);
    }
    if (!found.is_active) {
      throw new Error('This account has been suspended by an administrator.');
    }
    switchProfile(found.id);
    return authStore.getActiveProfile();
  };

  const registerLocal = async (data: {
    display_name: string;
    email: string;
    role: Role;
    department_id: string | null;
  }): Promise<Profile> => {
    const user = authStore.addUser(data);
    switchProfile(user.id);
    return authStore.getActiveProfile();
  };

  const signOut = async () => {
    cache.clear();
    if (supabase) {
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        // ignore
      }
    }
    setSession(null);
    setProfile(null);
    setActiveUser(null);
    localStorage.removeItem('civicsphere_active_user_id');
  };

  const permissions: Permission[] = profile?.is_active
    ? (authStore.hasPermission(profile.role, 'VIEW_MAP')
        ? (Object.keys(authStore) as unknown as Permission[]) // placeholder
        : [])
    : [];

  const hasPerm = (permission: Permission): boolean => {
    if (!profile || !profile.is_active) return false;
    return authStore.hasPermission(profile.role, permission);
  };

  return (
    <Context.Provider
      value={{
        session,
        profile,
        activeUser,
        loading,
        isLiveBackend,
        permissions,
        hasPerm,
        switchProfile,
        signInLocal,
        registerLocal,
        signOut,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export const useAuth = () => useContext(Context);
