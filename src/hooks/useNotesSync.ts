import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  linkedNotes: string[];
  isFavorite: boolean;
  folder?: string;
  blocks?: any[];
  richContent?: string;
  isRichText?: boolean;
  icon?: string;
  cover?: string;
  properties?: Record<string, any>;
  comments?: any[];
  parentId?: string;
  children?: string[];
}

export function useNotesSync(initialNotes: Note[]) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // Load notes: try DB first, then localStorage cache, then fallback to samples
  useEffect(() => {
    if (loaded) return;

    const loadNotes = async () => {
      // If logged in, try cloud first
      if (userId) {
        try {
          const { data, error } = await supabase
            .from('user_notes')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

          if (!error && data && data.length > 0) {
            const dbNotes: Note[] = data.map((row: any) => ({
              id: row.id,
              title: row.title,
              content: row.content || '',
              tags: row.tags || [],
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at),
              linkedNotes: row.linked_notes || [],
              isFavorite: row.is_favorite || false,
              folder: row.folder,
              icon: row.icon || '📄',
              richContent: row.rich_content,
              isRichText: row.is_rich_text || false,
              properties: row.properties || {},
              parentId: row.parent_id,
              children: row.children || [],
              blocks: [],
              comments: [],
            }));
            setNotes(dbNotes);
            localStorage.setItem('able-notes', JSON.stringify(dbNotes));
            console.log(`☁️ Loaded ${dbNotes.length} notes from cloud`);
            setLoaded(true);
            return;
          }
        } catch (e) {
          console.error('Cloud load error:', e);
        }
      }

      // Fallback: try localStorage cache
      try {
        const cached = localStorage.getItem('able-notes');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.length > 0) {
            const cachedNotes = parsed.map((n: any) => ({
              ...n,
              createdAt: new Date(n.createdAt),
              updatedAt: new Date(n.updatedAt),
            }));
            setNotes(cachedNotes);
            console.log(`📦 Loaded ${cachedNotes.length} notes from cache`);
            setLoaded(true);
            return;
          }
        }
      } catch (e) {
        console.warn('Cache load failed');
      }

      // Final fallback: sample notes
      setNotes(initialNotes);
      setLoaded(true);
    };

    // Wait a tick for userId to be set
    if (userId === null) {
      // Check if we already know there's no user
      supabase.auth.getUser().then(({ data }) => {
        if (!data.user) {
          // Not logged in, use cache or samples
          try {
            const cached = localStorage.getItem('able-notes');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.length > 0) {
                setNotes(parsed.map((n: any) => ({
                  ...n,
                  createdAt: new Date(n.createdAt),
                  updatedAt: new Date(n.updatedAt),
                })));
                setLoaded(true);
                return;
              }
            }
          } catch {}
          setNotes(initialNotes);
          setLoaded(true);
        }
      });
    } else {
      loadNotes();
    }
  }, [userId, loaded, initialNotes]);

  // Sync notes to database with debounce
  const syncToDb = useCallback(async (notesToSync: Note[]) => {
    if (!userId) return;

    setSyncing(true);
    try {
      const rows = notesToSync.map(note => ({
        id: note.id,
        user_id: userId,
        title: note.title,
        content: note.content,
        tags: note.tags,
        folder: note.folder || null,
        icon: note.icon || '📄',
        is_favorite: note.isFavorite,
        linked_notes: note.linkedNotes,
        rich_content: note.richContent || null,
        is_rich_text: note.isRichText || false,
        properties: note.properties || {},
        parent_id: note.parentId || null,
        children: note.children || [],
        created_at: note.createdAt.toISOString(),
        updated_at: note.updatedAt.toISOString(),
      }));

      const { error } = await supabase
        .from('user_notes')
        .upsert(rows, { onConflict: 'id' });

      if (error) {
        console.error('Failed to sync notes to cloud:', error);
      } else {
        console.log(`☁️ Synced ${rows.length} notes to cloud`);
      }
    } catch (e) {
      console.error('Cloud sync error:', e);
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  // Debounced sync
  const debouncedSync = useCallback((notesToSync: Note[]) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncToDb(notesToSync);
    }, 3000);
  }, [syncToDb]);

  // Update notes and trigger sync
  const updateNotes = useCallback((updater: Note[] | ((prev: Note[]) => Note[])) => {
    setNotes(prev => {
      const newNotes = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem('able-notes', JSON.stringify(newNotes));
      } catch (e) {
        console.warn('localStorage save failed');
      }
      debouncedSync(newNotes);
      return newNotes;
    });
  }, [debouncedSync]);

  // Delete from DB
  const deleteFromDb = useCallback(async (noteId: string) => {
    if (!userId) return;
    await supabase.from('user_notes').delete().eq('id', noteId).eq('user_id', userId);
  }, [userId]);

  return { notes, setNotes: updateNotes, syncing, deleteFromDb, userId, loaded };
}
