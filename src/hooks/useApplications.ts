import { useState, useEffect, useCallback } from 'react';
import { getUserApplications, createApplication, updateApplication, deleteApplication, getApplication } from '../services/applicationService';
import type { Application, ApplicationFormData } from '../types';

interface UseApplicationsReturn {
  applications: Application[];
  loading: boolean;
  error: Error | null;
  refetch: (useCache?: boolean) => Promise<void>;
  add: (data: ApplicationFormData) => Promise<Application>;
  update: (id: string, data: ApplicationFormData) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/**
 * Custom hook for managing applications with caching and optimistic updates
 * Eliminates duplicate queries and provides consistent state management
 */
export function useApplications(userId: string | undefined): UseApplicationsReturn {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async (useCache = true) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const apps = await getUserApplications(userId, useCache);
      setApplications(apps);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch applications');
      setError(error);
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const add = useCallback(async (data: ApplicationFormData): Promise<Application> => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Optimistic update: add temporary application
    const tempId = `temp-${Date.now()}`;
    const tempApp: Application = {
      id: tempId,
      userId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      timeline: [],
    };

    setApplications(prev => [tempApp, ...prev]);

    try {
      const newAppId = await createApplication(userId, data);
      // Fetch the complete application
      const newApp = await getApplication(newAppId);
      if (!newApp) {
        throw new Error('Failed to fetch created application');
      }
      // Replace temp with real application
      setApplications(prev => prev.map(app => 
        app.id === tempId ? newApp : app
      ));
      return newApp;
    } catch (err) {
      // Rollback on error
      setApplications(prev => prev.filter(app => app.id !== tempId));
      throw err;
    }
  }, [userId]);

  const update = useCallback(async (id: string, data: ApplicationFormData): Promise<void> => {
    // Optimistic update: update immediately in UI
    const previousApplications = [...applications];
    setApplications(prev => prev.map(app => 
      app.id === id ? { ...app, ...data, updatedAt: new Date() } : app
    ));

    try {
      await updateApplication(id, data);
      // Refresh to sync with server (in case of computed fields)
      await fetch(false);
    } catch (err) {
      // Rollback on error
      setApplications(previousApplications);
      const error = err instanceof Error ? err : new Error('Failed to update application');
      setError(error);
      throw err;
    }
  }, [applications, fetch]);

  const remove = useCallback(async (id: string): Promise<void> => {
    // Optimistic update: remove immediately from UI
    const previousApplications = [...applications];
    setApplications(prev => prev.filter(app => app.id !== id));

    try {
      await deleteApplication(id);
    } catch (err) {
      // Rollback on error
      setApplications(previousApplications);
      const error = err instanceof Error ? err : new Error('Failed to delete application');
      setError(error);
      throw err;
    }
  }, [applications]);

  return {
    applications,
    loading,
    error,
    refetch: fetch,
    add,
    update,
    remove,
  };
}

