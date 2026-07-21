import { useCallback, useEffect, useState } from 'react';
import { HierarchyComment, HierarchyCommentType } from '../../types/HierarchyComment';
import { apiFetch } from '../../lib/api';
const API_BASE = import.meta.env.VITE_API_URL;

interface UseHierarchyCommentsOptions {
  contextType: string;
  contextId: number;
  type: HierarchyCommentType;
}

export function useHierarchyComments({ contextType, contextId, type }: UseHierarchyCommentsOptions) {
  const [comments, setComments] = useState<HierarchyComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/hierarchy-comments?contextType=${encodeURIComponent(contextType)}&contextId=${contextId}&type=${type}`);
      if (!res.ok) throw new Error('Erreur lors du chargement des commentaires');
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [contextType, contextId, type]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = useCallback(async (values: { title: string; content: string; attachments?: File[] }) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('contextType', contextType);
      formData.append('contextId', String(contextId));
      formData.append('type', type);
      formData.append('title', values.title);
      formData.append('content', values.content);
      if (values.attachments) {
        values.attachments.forEach((file) => formData.append('attachments', file));
      }
      const res = await apiFetch(`${API_BASE}/hierarchy-comments`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Erreur lors de l\'ajout du commentaire');
      await fetchComments();
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [contextType, contextId, type, fetchComments]);

  return {
    comments,
    loading,
    error,
    refresh: fetchComments,
    addComment,
  };
}
