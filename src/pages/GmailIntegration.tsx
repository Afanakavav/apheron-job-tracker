import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  Collapse,
  Stack,
  Divider,
  Slider,
  Switch,
  FormControlLabel,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Email as EmailIcon,
  Link as LinkIcon,
  LinkOff,
  Refresh,
  CheckCircle,
  Work,
  Close,
  Add,
  ExpandMore,
  ExpandLess,
  Folder as FolderIcon,
  Search,
  FilterList,
  Visibility,
  CheckBox,
  CheckBoxOutlineBlank,
  Download,
  Schedule,
  History,
  ToggleOn,
  ToggleOff,
  DeleteForever as DeleteForeverIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import {
  requestAccessToken,
  isGmailConnected,
  disconnectGmail,
  fetchRecentEmails,
  getGmailUserEmail,
} from '../services/gmailServiceClient';
import type { JobOfferFromEmail } from '../services/gmailServiceClient';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';
import { createApplication } from '../services/applicationService';
import { getApplicationFolderName as getApplicationFolderNameUtil } from '../utils/documentFolders';
import type { ApplicationFormData } from '../types';
import { GAEvents } from '../services/googleAnalytics';
import {
  getGmailSettings,
  updateGmailSettings,
  shouldAutoScan,
  updateLastScanTimestamp,
  addToImportHistory,
  getImportHistory,
  deleteImportHistoryEntry,
  type GmailSettings,
  type ImportHistoryEntry,
} from '../services/gmailSettingsService';
import { getSentEmails, deleteSentEmail } from '../services/sentEmailService';
import { getUserApplications, getArchivedApplications } from '../services/applicationService';
import type { SentEmail, Application } from '../types';

const GmailIntegration: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gmailEmail, setGmailEmail] = useState('');
  const [jobOffers, setJobOffers] = useState<JobOfferFromEmail[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobOfferFromEmail | null>(null);
  const [importing, setImporting] = useState(false);
  
  // Advanced Search State
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const [maxResults, setMaxResults] = useState(20);
  const [daysBack, setDaysBack] = useState(30);
  const [confidenceThreshold, setConfidenceThreshold] = useState(60);
  const [filteredOffers, setFilteredOffers] = useState<JobOfferFromEmail[]>([]);
  
  // Batch Import State
  const [selectedOffers, setSelectedOffers] = useState<Set<string>>(new Set());
  const [batchImporting, setBatchImporting] = useState(false);
  
  // Email Preview State
  const [emailPreview, setEmailPreview] = useState<{ email: any; job: JobOfferFromEmail } | null>(null);
  const [allEmails, setAllEmails] = useState<any[]>([]); // Store fetched emails for preview
  
  // Auto-scan Settings State
  const [autoScanSettings, setAutoScanSettings] = useState<GmailSettings>({
    autoScanEnabled: false,
    autoScanTime: '09:00',
    lastScanTimestamp: null,
  });
  const [showAutoScanSettings, setShowAutoScanSettings] = useState(false);
  
  // Import History State
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Sent Emails State
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [showSentEmails, setShowSentEmails] = useState(false);
  const [loadingSentEmails, setLoadingSentEmails] = useState(false);
  const [selectedSentEmail, setSelectedSentEmail] = useState<SentEmail | null>(null);
  const [sentEmailPreviewOpen, setSentEmailPreviewOpen] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    checkConnection();
  }, [currentUser]);

  // Load settings and history when connected
  useEffect(() => {
    if (connected && currentUser) {
      loadSettings();
      loadHistory();
      loadSentEmails(); // Load sent emails automatically
      loadPersistedState(); // Load persisted state from localStorage
    }
  }, [connected, currentUser]);

  // Reload sent emails when page becomes visible (user navigates to this page)
  useEffect(() => {
    if (!connected || !currentUser) return;

    // Reload when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && currentUser) {
        console.log('👁️ [GmailIntegration] Page visible, reloading sent emails...');
        loadSentEmails();
      }
    };

    // Load immediately when component mounts
    loadSentEmails();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connected, currentUser]);

  // Listen for visibility changes to reload state when user returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentUser) {
        console.log('👁️ Page became visible, reloading Gmail state...');
        checkConnection(); // Recheck connection status
        loadPersistedState(); // Reload state from localStorage
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  // Persist state to localStorage when it changes
  // BUT don't persist during initial load to avoid overwriting dialog connection
  useEffect(() => {
    if (currentUser && !loading) {
      // Only persist after initial load is complete
      persistState();
    }
  }, [connected, gmailEmail, jobOffers, allEmails, customQuery, maxResults, daysBack, confidenceThreshold, scanning, scanProgress, loading]);

  // Auto-scan scheduler with silent auto-import - check every 15 minutes
  useEffect(() => {
    if (!connected || !currentUser || !autoScanSettings.autoScanEnabled) return;

    const checkAutoScan = async () => {
      try {
        const shouldRun = await shouldAutoScan(currentUser.uid);
        if (shouldRun) {
          console.log('🔍 Auto-scan triggered at', new Date().toLocaleString());
          
          // Silent scan: fetch and parse emails
          try {
            setScanning(true);
            const fetchedEmails = await fetchRecentEmails(currentUser.uid, 20, 'newer_than:7d');
            
            if (fetchedEmails.length > 0) {
              const savedLang = localStorage.getItem('app_language');
              const browserLang = navigator.language.split('-')[0];
              const userLang = savedLang || (['it', 'en'].includes(browserLang) ? browserLang : 'en');
              
              const parseEmailForJobOffers = httpsCallable(functions, 'parseEmailForJobOffers');
              const result = await parseEmailForJobOffers({ 
                emails: fetchedEmails.slice(0, 15), // Process first 15
                userLanguage: userLang
              });
              
              const response = result.data as any;
              const newOffers = response.jobOffers || [];
              
              // Check import history to avoid duplicates
              const history = await getImportHistory(currentUser.uid, 100);
              const importedEmailIds = new Set(history.map(h => h.id || ''));
              
              // Filter out already imported offers
              const freshOffers = newOffers.filter((offer: JobOfferFromEmail) => 
                !importedEmailIds.has(offer.emailId) && offer.confidence >= 70
              );
              
              // Auto-import silently if there are new offers
              if (freshOffers.length > 0) {
                let importedCount = 0;
                for (const job of freshOffers) {
                  try {
                    const parseSalary = (salaryStr: string | undefined) => {
                      if (!salaryStr) return { min: undefined, max: undefined };
                      const numbers = salaryStr.match(/[\d,]+/g);
                      if (numbers && numbers.length >= 2) {
                        const min = parseInt(numbers[0].replace(/,/g, ''));
                        const max = parseInt(numbers[1].replace(/,/g, ''));
                        return { min, max };
                      } else if (numbers && numbers.length === 1) {
                        const salary = parseInt(numbers[0].replace(/,/g, ''));
                        return { min: salary, max: undefined };
                      }
                      return { min: undefined, max: undefined };
                    };
                    
                    const { min: salaryMin, max: salaryMax } = parseSalary(job.salary);

                    const applicationData: ApplicationFormData = {
                      company: job.company,
                      jobTitle: job.jobTitle,
                      location: job.location || '',
                      isRemote: job.location?.toLowerCase().includes('remote') || false,
                      jobUrl: job.jobUrl || '',
                      jobDescription: job.jobDescription,
                      ...(salaryMin !== undefined && { salaryMin }),
                      ...(salaryMax !== undefined && { salaryMax }),
                      salaryCurrency: 'EUR',
                      source: 'email',
                      status: 'saved',
                      priority: 'medium',
                      notes: `Auto-imported from email: ${job.emailSubject}\nDate: ${job.emailDate.toLocaleDateString()}\nConfidence: ${job.confidence}%`,
                      tags: ['email', 'imported', 'auto-imported'],
                    };

                    const applicationId = await createApplication(currentUser.uid, applicationData);
                    await addToImportHistory(currentUser.uid, job, applicationId);
                    importedCount++;
                  } catch (err) {
                    console.error('Error auto-importing job:', err);
                  }
                }
                
                // Show notification
                if (importedCount > 0) {
                  setError(`✅ ${t('gmail.autoImported', { count: importedCount }) || `${importedCount} candidatura${importedCount > 1 ? 'e' : ''} importata${importedCount > 1 ? 'e' : ''} automaticamente`}`);
                  setTimeout(() => setError(null), 5000); // Clear after 5 seconds
                }
              }
            }
          } catch (err) {
            console.error('Error in silent auto-import:', err);
          } finally {
            setScanning(false);
          }
          
          await updateLastScanTimestamp(currentUser.uid);
        }
      } catch (error) {
        console.error('Error in auto-scan:', error);
        setScanning(false);
      }
    };

    // Check immediately
    checkAutoScan();

    // Then check every 15 minutes
    const interval = setInterval(checkAutoScan, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [connected, currentUser, autoScanSettings.autoScanEnabled]);

  const checkConnection = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      console.log('🔍 [GmailIntegration] Performing REAL connection check from Firestore...');
      
      // Always check Firestore for real connection status
      const isConnected = await isGmailConnected(currentUser.uid);
      setConnected(isConnected);

      if (isConnected) {
        console.log('✅ [GmailIntegration] Gmail connected, fetching email...');
        const email = await getGmailUserEmail(currentUser.uid);
        setGmailEmail(email);
        
        // Update localStorage with current status
        const stateKey = `gmail_integration_state_${currentUser.uid}`;
        const state = {
          isConnected: true,
          gmailEmail: email,
          jobOffers: [],
          customQuery: '',
          maxResults: 20,
          daysBack: 30,
          confidenceThreshold: 60,
          scanning: false,
          scanProgress: { current: 0, total: 0 },
          timestamp: Date.now(),
        };
        localStorage.setItem(stateKey, JSON.stringify(state));
        console.log('💾 [GmailIntegration] Connection state saved to localStorage');
      } else {
        console.log('❌ [GmailIntegration] Gmail NOT connected');
        // Clear localStorage if not connected
        const stateKey = `gmail_integration_state_${currentUser.uid}`;
        localStorage.removeItem(stateKey);
      }
    } catch (err: any) {
      console.error('❌ [GmailIntegration] Error checking connection:', err);
      setError(err.message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    if (!currentUser) return;
    try {
      const settings = await getGmailSettings(currentUser.uid);
      setAutoScanSettings(settings);
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const loadHistory = async () => {
    if (!currentUser) return;
    try {
      setLoadingHistory(true);
      const history = await getImportHistory(currentUser.uid, 20);
      setImportHistory(history);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadSentEmails = async () => {
    if (!currentUser) return;
    try {
      setLoadingSentEmails(true);
      console.log('📬 [GmailIntegration] Loading sent emails for user:', currentUser.uid);
      const emails = await getSentEmails(currentUser.uid);
      console.log('✅ [GmailIntegration] Loaded', emails.length, 'sent emails');
      setSentEmails(emails);
      
      // Load applications to get application details for grouping
      // Include both active and archived applications to show correct names for deleted applications
      try {
        const [activeApps, archivedApps] = await Promise.all([
          getUserApplications(currentUser.uid),
          getArchivedApplications(currentUser.uid)
        ]);
        // Combine active and archived applications
        setApplications([...activeApps, ...archivedApps]);
      } catch (err) {
        console.error('Error loading applications:', err);
      }
      
      // Auto-expand section if there are emails and it's not already shown
      if (emails.length > 0 && !showSentEmails) {
        console.log('📧 [GmailIntegration] Auto-expanding sent emails section');
        setShowSentEmails(true);
      }
    } catch (err: any) {
      console.error('❌ [GmailIntegration] Error loading sent emails:', err);
      console.error('Error details:', {
        message: err?.message,
        code: err?.code,
        stack: err?.stack,
      });
    } finally {
      setLoadingSentEmails(false);
    }
  };

  const handleDeleteSentEmail = async (emailId: string) => {
    if (!currentUser) return;
    if (!window.confirm(t('gmail.deleteEmailConfirm'))) return;

    try {
      await deleteSentEmail(emailId, currentUser.uid);
      await loadSentEmails();
    } catch (err) {
      console.error('Error deleting sent email:', err);
      setError(t('gmail.errorDeletingEmail'));
    }
  };

  const handleDeleteImportHistoryEntry = async (entryId: string) => {
    if (!currentUser) return;
    if (!window.confirm(t('gmail.deleteImportConfirm'))) return;

    try {
      await deleteImportHistoryEntry(currentUser.uid, entryId);
      await loadHistory();
    } catch (err) {
      console.error('Error deleting import history entry:', err);
      setError(t('gmail.errorDeletingImport'));
    }
  };

  const handleViewSentEmail = (email: SentEmail) => {
    setSelectedSentEmail(email);
    setSentEmailPreviewOpen(true);
  };

  // Persist state to localStorage
  const persistState = () => {
    if (!currentUser) return;
    
    try {
      const stateKey = `gmail_integration_state_${currentUser.uid}`;
      
      // Check if there's already a recent state that shouldn't be overwritten
      const existingState = localStorage.getItem(stateKey);
      if (existingState) {
        try {
          const existing = JSON.parse(existingState);
          const age = Date.now() - existing.timestamp;
          
          // If there's a recent connection (< 5 minutes) and we're trying to save disconnected state, skip
          if (age < 5 * 60 * 1000 && existing.isConnected && !connected) {
            console.log('⏸️ [GmailIntegration] Skipping persist - recent connection exists, current state is disconnected');
            return;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      const state = {
        isConnected: connected, // ✅ ADD CONNECTION STATUS
        gmailEmail, // ✅ ADD EMAIL
        jobOffers: jobOffers.map(offer => ({
          ...offer,
          emailDate: offer.emailDate.toISOString(),
        })),
        customQuery,
        maxResults,
        daysBack,
        confidenceThreshold,
        scanning, // Save scanning state
        scanProgress, // Save progress
        timestamp: Date.now(),
      };
      
      localStorage.setItem(stateKey, JSON.stringify(state));
      console.log('✅ Gmail state persisted to localStorage:', { isConnected: connected, email: gmailEmail });
    } catch (err) {
      console.error('Error persisting Gmail state:', err);
    }
  };

  // Load persisted state from localStorage
  const loadPersistedState = () => {
    if (!currentUser) return;
    
    try {
      const stateKey = `gmail_integration_state_${currentUser.uid}`;
      const savedState = localStorage.getItem(stateKey);
      
      if (savedState) {
        const state = JSON.parse(savedState);
        
        // Only load if state is less than 24 hours old
        const age = Date.now() - state.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (age < maxAge) {
          // ✅ RESTORE CONNECTION STATUS
          if (state.isConnected !== undefined) {
            setConnected(state.isConnected);
            setGmailEmail(state.gmailEmail || '');
            console.log('✅ Connection status restored:', { isConnected: state.isConnected, email: state.gmailEmail });
          }
          
          // Restore job offers with parsed dates
          const restoredOffers = state.jobOffers.map((offer: any) => ({
            ...offer,
            emailDate: new Date(offer.emailDate),
          }));
          
          setJobOffers(restoredOffers);
          applyConfidenceFilter(restoredOffers);
          setCustomQuery(state.customQuery || '');
          setMaxResults(state.maxResults || 20);
          setDaysBack(state.daysBack || 30);
          setConfidenceThreshold(state.confidenceThreshold || 60);
          
          // Restore scanning state (but don't resume - user must manually restart)
          if (state.scanning) {
            // If scanning was true, show a message that scan was interrupted
            setError(`⚠️ ${t('gmail.scanInterrupted')}`);
            setScanProgress(state.scanProgress || { current: 0, total: 0 });
          }
          
          console.log('Gmail state restored from localStorage');
        } else {
          console.log('Persisted Gmail state is too old, clearing...');
          localStorage.removeItem(stateKey);
        }
      }
    } catch (err) {
      console.error('Error loading persisted Gmail state:', err);
    }
  };

  // Clear persisted state
  const clearPersistedState = () => {
    if (!currentUser) return;
    try {
      const stateKey = `gmail_integration_state_${currentUser.uid}`;
      localStorage.removeItem(stateKey);
      console.log('Gmail state cleared from localStorage');
    } catch (err) {
      console.error('Error clearing persisted Gmail state:', err);
    }
  };

  const handleToggleAutoScan = async (enabled: boolean) => {
    if (!currentUser) return;
    try {
      await updateGmailSettings(currentUser.uid, { autoScanEnabled: enabled });
      setAutoScanSettings({ ...autoScanSettings, autoScanEnabled: enabled });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleChangeAutoScanTime = async (time: string) => {
    if (!currentUser) return;
    try {
      await updateGmailSettings(currentUser.uid, { autoScanTime: time });
      setAutoScanSettings({ ...autoScanSettings, autoScanTime: time });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleConnect = async () => {
    if (!currentUser) return;

    try {
      setError(null);
      // Trigger OAuth flow (Google will handle the popup)
      await requestAccessToken(currentUser.uid);
      
      // Connection successful
      await checkConnection();
    } catch (err: any) {
      console.error('Error connecting Gmail:', err);
      setError(`${t('gmail.errorConnectingGmail')}: ${err.message}`);
    }
  };

  const handleDisconnect = async () => {
    if (!currentUser) return;
    
    if (!window.confirm(t('gmail.disconnectConfirm'))) return;

    try {
      await disconnectGmail(currentUser.uid);
      setConnected(false);
      setGmailEmail('');
      setJobOffers([]);
      setError(null);
      clearPersistedState(); // Clear persisted state on disconnect
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleScanEmails = async () => {
    if (!currentUser) return;

    try {
      setScanning(true);
      setError(null);
      setScanProgress({ current: 0, total: 0 });

      // Build custom query if provided
      let searchQuery = '';
      if (customQuery.trim()) {
        // User provided custom keywords
        searchQuery = `(${customQuery}) newer_than:${daysBack}d`;
      }

      // Fetch recent emails with custom query and max results
      const fetchedEmails = await fetchRecentEmails(
        currentUser.uid,
        maxResults,
        searchQuery
      );

      if (fetchedEmails.length === 0) {
        setError(t('gmail.noEmailsFound', { days: daysBack }));
        return;
      }

      // Store emails for preview
      setAllEmails(fetchedEmails);

      // Parse emails for job offers using Cloud Function
      console.log('📧 [GmailIntegration] Calling Cloud Function to parse emails...');
      
      // Get user language preference
      const savedLang = localStorage.getItem('app_language');
      const browserLang = navigator.language.split('-')[0];
      const userLang = savedLang || (['it', 'en'].includes(browserLang) ? browserLang : 'en');
      
      // Process emails in batches to avoid timeout
      const BATCH_SIZE = 15; // Process 15 emails at a time (less than server limit of 20)
      const allOffers: JobOfferFromEmail[] = [];
      let totalProcessed = 0;
      const totalReceived = fetchedEmails.length;
      
      setScanProgress({ current: 0, total: fetchedEmails.length });
      
      // Process emails in batches
      for (let i = 0; i < fetchedEmails.length; i += BATCH_SIZE) {
        const batch = fetchedEmails.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(fetchedEmails.length / BATCH_SIZE);
        
        console.log(`📧 [GmailIntegration] Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)`);
        
        try {
          const parseEmailForJobOffers = httpsCallable(functions, 'parseEmailForJobOffers');
          const result = await parseEmailForJobOffers({ 
            emails: batch,
            userLanguage: userLang
          });
          
          const response = result.data as any;
          const batchOffers = response.jobOffers || [];
          
          allOffers.push(...batchOffers);
          totalProcessed += batch.length;
          
          // Update progress
          setScanProgress({ current: Math.min(totalProcessed, fetchedEmails.length), total: fetchedEmails.length });
          
          console.log(`✅ [GmailIntegration] Batch ${batchNumber} completed: ${batchOffers.length} job offers found`);
          
          // Small delay between batches to avoid overwhelming the server
          if (i + BATCH_SIZE < fetchedEmails.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err: any) {
          console.error(`❌ [GmailIntegration] Error processing batch ${batchNumber}:`, err);
          // Continue with next batch even if one fails
          totalProcessed += batch.length;
          setScanProgress({ current: Math.min(totalProcessed, fetchedEmails.length), total: fetchedEmails.length });
        }
      }
      
      console.log(`✅ [GmailIntegration] Completed: ${allOffers.length} total job offers from ${totalProcessed} emails`);
      
      if (totalProcessed < totalReceived) {
        setError(t('gmail.processedEmails', { processed: totalProcessed, total: totalReceived }));
      }

      setJobOffers(allOffers);
      
      // Apply confidence filter
      applyConfidenceFilter(allOffers);
      
      // Reset selections
      setSelectedOffers(new Set());
      setScanProgress({ current: 0, total: 0 });

      if (allOffers.length === 0) {
        setError(t('gmail.noJobOffersFound'));
      }
    } catch (err: any) {
      console.error('Error scanning emails:', err);
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  // Apply confidence threshold filter
  const applyConfidenceFilter = (offers: JobOfferFromEmail[]) => {
    const filtered = offers.filter(offer => offer.confidence >= confidenceThreshold);
    setFilteredOffers(filtered);
  };

  // Update filtered offers when threshold changes
  useEffect(() => {
    if (jobOffers.length > 0) {
      applyConfidenceFilter(jobOffers);
    }
  }, [confidenceThreshold, jobOffers]);

  const handleImportJob = (job: JobOfferFromEmail) => {
    // Find the original email for preview
    const originalEmail = allEmails.find(email => email.id === job.emailId);
    if (originalEmail) {
      setEmailPreview({ email: originalEmail, job });
    } else {
      // Fallback: open without preview
      setSelectedJob(job);
    }
  };

  const handleToggleSelect = (emailId: string) => {
    const newSelected = new Set(selectedOffers);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedOffers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedOffers.size === filteredOffers.length) {
      setSelectedOffers(new Set());
    } else {
      setSelectedOffers(new Set(filteredOffers.map(offer => offer.emailId)));
    }
  };

  const handleBatchImport = async () => {
    if (!currentUser || selectedOffers.size === 0) return;

    const confirmed = window.confirm(
      t('gmail.batchImportConfirm', { count: selectedOffers.size, plural: selectedOffers.size > 1 ? 's' : '' })
    );
    if (!confirmed) return;

    try {
      setBatchImporting(true);
      setError(null);

      const selectedJobs = filteredOffers.filter(job => selectedOffers.has(job.emailId));
      let successCount = 0;
      let errorCount = 0;

      for (const job of selectedJobs) {
        try {
          const parseSalary = (salaryStr: string | undefined) => {
            if (!salaryStr) return { min: undefined, max: undefined };
            const numbers = salaryStr.match(/[\d,]+/g);
            if (numbers && numbers.length >= 2) {
              const min = parseInt(numbers[0].replace(/,/g, ''));
              const max = parseInt(numbers[1].replace(/,/g, ''));
              return { min, max };
            } else if (numbers && numbers.length === 1) {
              const salary = parseInt(numbers[0].replace(/,/g, ''));
              return { min: salary, max: undefined };
            }
            return { min: undefined, max: undefined };
          };

          const { min: salaryMin, max: salaryMax } = parseSalary(job.salary);

          const applicationData: ApplicationFormData = {
            company: job.company,
            jobTitle: job.jobTitle,
            location: job.location || '',
            isRemote: job.location?.toLowerCase().includes('remote') || false,
            jobUrl: job.jobUrl || '',
            jobDescription: job.jobDescription,
            ...(salaryMin !== undefined && { salaryMin }),
            ...(salaryMax !== undefined && { salaryMax }),
            salaryCurrency: 'EUR',
            source: 'email',
            status: 'saved',
            priority: 'medium',
            notes: `Imported from email: ${job.emailSubject}\nDate: ${job.emailDate.toLocaleDateString()}\nConfidence: ${job.confidence}%`,
            tags: ['email', 'imported', 'batch'],
          };

          await createApplication(currentUser.uid, applicationData);
          successCount++;
        } catch (err) {
          console.error(`Error importing job ${job.jobTitle}:`, err);
          errorCount++;
        }
      }

      // Track analytics
      GAEvents.createApplication('saved');

      // Add to import history
      for (const job of selectedJobs) {
        await addToImportHistory(currentUser.uid, job);
      }

      // Remove imported jobs from list
      const updatedOffers = jobOffers.filter(j => !selectedOffers.has(j.emailId));
      setJobOffers(updatedOffers);
      applyConfidenceFilter(updatedOffers);
      setSelectedOffers(new Set());

      // Reload history
      await loadHistory();

      alert(t('gmail.batchImportSuccess', { 
        success: successCount, 
        errors: errorCount > 0 ? t('gmail.batchImportErrors', { count: errorCount }) : '' 
      }));
    } catch (err: any) {
      console.error('Error batch importing:', err);
      setError(err.message);
    } finally {
      setBatchImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!currentUser || !selectedJob) return;

    try {
      setImporting(true);
      setError(null);

      // Parse salary if available
      const parseSalary = (salaryStr: string | undefined) => {
        if (!salaryStr) return { min: undefined, max: undefined };
        
        // Extract numbers from salary string (e.g., "€40k-€50k" or "40,000 - 50,000")
        const numbers = salaryStr.match(/[\d,]+/g);
        if (numbers && numbers.length >= 2) {
          const min = parseInt(numbers[0].replace(/,/g, ''));
          const max = parseInt(numbers[1].replace(/,/g, ''));
          return { min, max };
        } else if (numbers && numbers.length === 1) {
          const salary = parseInt(numbers[0].replace(/,/g, ''));
          return { min: salary, max: undefined };
        }
        return { min: undefined, max: undefined };
      };
      
      const { min: salaryMin, max: salaryMax } = parseSalary(selectedJob.salary);

      const applicationData: ApplicationFormData = {
        company: selectedJob.company,
        jobTitle: selectedJob.jobTitle,
        location: selectedJob.location || '',
        isRemote: selectedJob.location?.toLowerCase().includes('remote') || false,
        jobUrl: selectedJob.jobUrl || '',
        jobDescription: selectedJob.jobDescription,
        ...(salaryMin !== undefined && { salaryMin }),
        ...(salaryMax !== undefined && { salaryMax }),
        salaryCurrency: 'EUR',
        source: 'email',
        status: 'saved',
        priority: 'medium',
        notes: `Imported from email: ${selectedJob.emailSubject}\nDate: ${selectedJob.emailDate.toLocaleDateString()}\nConfidence: ${selectedJob.confidence}%`,
        tags: ['email', 'imported'],
      };

      const applicationId = await createApplication(currentUser.uid, applicationData);

      // Track analytics
      GAEvents.createApplication('saved');

      // Add to import history
      await addToImportHistory(currentUser.uid, selectedJob, applicationId);

      // Remove from list
      const updatedOffers = jobOffers.filter(j => j.emailId !== selectedJob.emailId);
      setJobOffers(updatedOffers);
      applyConfidenceFilter(updatedOffers);
      setSelectedJob(null);

      // Reload history
      await loadHistory();

      alert(t('gmail.importSuccess'));
    } catch (err: any) {
      console.error('Error importing job:', err);
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  // Group emails by application - MUST be at top level, not inside JSX
  const emailsByApplication = useMemo(() => {
    const grouped: Record<string, SentEmail[]> = {};
    const noApplication: SentEmail[] = [];
    
    sentEmails.forEach((email) => {
      if (email.applicationId) {
        if (!grouped[email.applicationId]) {
          grouped[email.applicationId] = [];
        }
        grouped[email.applicationId].push(email);
      } else {
        noApplication.push(email);
      }
    });
    
    return { grouped, noApplication };
  }, [sentEmails]);
  
  // Get application folder name - helper function
  const getApplicationFolderName = (applicationId: string): string => {
    const app = applications.find(a => a.id === applicationId);
    if (app) {
      // Use the same format as documentFolders.ts
      return getApplicationFolderNameUtil(app);
    }
    return `Application (ID: ${applicationId.substring(0, 8)}...)`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('gmail.title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {t('gmail.subtitle')}
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!connected ? (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <EmailIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                {t('gmail.connectGmail')}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {t('gmail.connectGmailDesc')}
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<LinkIcon />}
                onClick={handleConnect}
                sx={{ mt: 2 }}
              >
                {t('gmail.connectGmail')}
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <CheckCircle />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{t('gmail.connected')}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {gmailEmail}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title={t('gmail.autoScanSettings')}>
                    <IconButton
                      color={autoScanSettings.autoScanEnabled ? 'success' : 'default'}
                      onClick={() => setShowAutoScanSettings(!showAutoScanSettings)}
                    >
                      <Badge color="success" variant="dot" invisible={!autoScanSettings.autoScanEnabled}>
                        <Schedule />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('gmail.history')}>
                    <IconButton
                      color="primary"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      <Badge badgeContent={importHistory.length} color="primary">
                        <History />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('gmail.sentEmailsTitle')}>
                    <IconButton
                      color="secondary"
                      onClick={() => {
                        setShowSentEmails(!showSentEmails);
                        if (!showSentEmails) {
                          loadSentEmails();
                        }
                      }}
                    >
                      <Badge badgeContent={sentEmails.length} color="secondary">
                        <EmailIcon />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  <Button
                    variant="contained"
                    color="error"
                    size="large"
                    startIcon={<LinkOff />}
                    onClick={handleDisconnect}
                    sx={{
                      fontWeight: 'bold',
                      boxShadow: 3,
                      '&:hover': {
                        boxShadow: 6,
                      },
                    }}
                  >
                    {t('gmail.disconnectGmail')}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Auto-scan Settings Section */}
          <Collapse in={showAutoScanSettings}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Schedule sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Auto-scan Scheduler
                  </Typography>
                </Box>
                
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoScanSettings.autoScanEnabled}
                        onChange={(e) => handleToggleAutoScan(e.target.checked)}
                        color="success"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {autoScanSettings.autoScanEnabled ? <ToggleOn color="success" /> : <ToggleOff />}
                        <Typography>
                          {t('gmail.enableDailyAutoScan')}
                        </Typography>
                      </Box>
                    }
                  />

                  {autoScanSettings.autoScanEnabled && (
                    <>
                      <TextField
                        label={t('gmail.scanTime')}
                        type="time"
                        value={autoScanSettings.autoScanTime}
                        onChange={(e) => handleChangeAutoScanTime(e.target.value)}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        inputProps={{
                          step: 300, // 5 min
                        }}
                        sx={{ maxWidth: 200 }}
                      />

                      <Alert severity="info">
                        <span dangerouslySetInnerHTML={{ __html: t('gmail.autoScanInfo', { time: autoScanSettings.autoScanTime }) }} />
                        {autoScanSettings.lastScanTimestamp && (
                          <>
                            <br />
                            <span dangerouslySetInnerHTML={{ __html: t('gmail.lastScanAt', { date: new Date(autoScanSettings.lastScanTimestamp).toLocaleString() }) }} />
                          </>
                        )}
                      </Alert>
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Collapse>

          {/* Import History Section */}
          <Collapse in={showHistory}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <History sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">
                      {t('gmail.history')}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<Refresh />}
                    onClick={loadHistory}
                    disabled={loadingHistory}
                  >
                    {t('gmail.update')}
                  </Button>
                </Box>

                {loadingHistory ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : importHistory.length === 0 ? (
                  <Alert severity="info">
                    {t('gmail.noImportsYet')}
                  </Alert>
                ) : (
                  <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <List>
                      {importHistory.map((entry) => (
                        <ListItem
                          key={entry.id}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            mb: 1,
                          }}
                          secondaryAction={
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => entry.id && handleDeleteImportHistoryEntry(entry.id)}
                              color="error"
                            >
                              <DeleteForeverIcon />
                            </IconButton>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'success.main' }}>
                              <CheckCircle />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1">{entry.jobTitle}</Typography>
                                <Chip label={`${entry.confidence}%`} size="small" color="success" />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {entry.company}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {t('gmail.importedAt')}: {entry.importedAt.toLocaleDateString()} • 
                                  {t('gmail.emailDate')}: {entry.emailDate.toLocaleDateString()}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Collapse>

          {/* Sent Emails Section */}
          <Collapse in={showSentEmails}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EmailIcon sx={{ mr: 1, color: 'secondary.main' }} />
                    <Typography variant="h6">
                      {t('gmail.sentEmailsTitle')}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<Refresh />}
                    onClick={loadSentEmails}
                    disabled={loadingSentEmails}
                  >
                    {t('gmail.update')}
                  </Button>
                </Box>

                {loadingSentEmails ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : sentEmails.length === 0 ? (
                  <Alert severity="info">
                    {t('gmail.noSentEmails')}
                  </Alert>
                ) : (() => {
                  const applicationIds = Object.keys(emailsByApplication.grouped);
                  
                  return (
                    <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Grouped by Application */}
                        {applicationIds.map((appId) => {
                          const emailsInFolder = emailsByApplication.grouped[appId];
                          if (emailsInFolder.length === 0) return null;
                          
                          const folderName = getApplicationFolderName(appId);
                          
                          return (
                            <Accordion key={appId} defaultExpanded={false}>
                              <AccordionSummary
                                expandIcon={<ExpandMore />}
                                sx={{
                                  '& .MuiAccordionSummary-content': {
                                    alignItems: 'center',
                                    gap: 1,
                                  },
                                }}
                              >
                                <FolderIcon sx={{ color: 'secondary.main' }} />
                                <Typography variant="h6" sx={{ flex: 1 }}>
                                  {folderName}
                                </Typography>
                                <Chip 
                                  label={`${emailsInFolder.length} ${emailsInFolder.length === 1 ? 'email' : 'email'}`}
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                />
                              </AccordionSummary>
                              <AccordionDetails>
                                <List>
                                  {emailsInFolder.map((email) => (
                                    <ListItem
                                      key={email.id}
                                      sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        mb: 1,
                                      }}
                                      secondaryAction={
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                          <IconButton
                                            edge="end"
                                            size="small"
                                            onClick={() => handleViewSentEmail(email)}
                                            color="primary"
                                          >
                                            <Visibility />
                                          </IconButton>
                                          <IconButton
                                            edge="end"
                                            size="small"
                                            onClick={() => handleDeleteSentEmail(email.id)}
                                            color="error"
                                          >
                                            <DeleteForeverIcon />
                                          </IconButton>
                                        </Box>
                                      }
                                    >
                                      <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                          <EmailIcon />
                                        </Avatar>
                                      </ListItemAvatar>
                                      <ListItemText
                                        primary={
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography variant="subtitle1">{email.subject}</Typography>
                                            {email.emailType && (
                                              <Chip 
                                                label={
                                                  email.emailType === 'application' ? t('gmail.emailTypeApplication') :
                                                  email.emailType === 'confirmation' ? t('gmail.emailTypeConfirmation') :
                                                  email.emailType === 'interview_feedback' ? t('gmail.emailTypeInterviewFeedback') :
                                                  t('gmail.emailTypeFeedbackRequest')
                                                } 
                                                size="small" 
                                                color="secondary" 
                                              />
                                            )}
                                          </Box>
                                        }
                                        secondary={
                                          <Box>
                                            <Typography variant="body2" color="text.secondary">
                                              A: {email.to}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              {email.sentAt ? new Date(email.sentAt).toLocaleString() : t('gmail.dateNotAvailable')}
                                              {email.attachmentNames.length > 0 && ` • ${email.attachmentNames.length} ${email.attachmentNames.length === 1 ? t('gmail.attachment') : t('gmail.attachmentsPlural')}`}
                                            </Typography>
                                          </Box>
                                        }
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                              </AccordionDetails>
                            </Accordion>
                          );
                        })}
                        
                        {/* Emails without application */}
                        {emailsByApplication.noApplication.length > 0 && (
                          <Accordion defaultExpanded={false}>
                            <AccordionSummary
                              expandIcon={<ExpandMore />}
                              sx={{
                                '& .MuiAccordionSummary-content': {
                                  alignItems: 'center',
                                  gap: 1,
                                },
                              }}
                            >
                              <FolderIcon sx={{ color: 'text.secondary' }} />
                              <Typography variant="h6" sx={{ flex: 1 }}>
                                {t('gmail.emailWithoutApplication')}
                              </Typography>
                              <Chip 
                                label={`${emailsByApplication.noApplication.length} ${emailsByApplication.noApplication.length === 1 ? 'email' : 'email'}`}
                                size="small"
                                variant="outlined"
                              />
                            </AccordionSummary>
                            <AccordionDetails>
                              <List>
                                {emailsByApplication.noApplication.map((email) => (
                                  <ListItem
                                    key={email.id}
                                    sx={{
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      borderRadius: 1,
                                      mb: 1,
                                    }}
                                    secondaryAction={
                                      <Box sx={{ display: 'flex', gap: 1 }}>
                                        <IconButton
                                          edge="end"
                                          size="small"
                                          onClick={() => handleViewSentEmail(email)}
                                          color="primary"
                                        >
                                          <Visibility />
                                        </IconButton>
                                        <IconButton
                                          edge="end"
                                          size="small"
                                          onClick={() => handleDeleteSentEmail(email.id)}
                                          color="error"
                                        >
                                          <DeleteForeverIcon />
                                        </IconButton>
                                      </Box>
                                    }
                                  >
                                    <ListItemAvatar>
                                      <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                        <EmailIcon />
                                      </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                      primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                          <Typography variant="subtitle1">{email.subject}</Typography>
                                          {email.emailType && (
                                            <Chip 
                                              label={
                                                email.emailType === 'application' ? 'Candidatura' :
                                                email.emailType === 'confirmation' ? 'Conferma' :
                                                email.emailType === 'interview_feedback' ? 'Feedback Colloquio' :
                                                'Richiesta Feedback'
                                              } 
                                              size="small" 
                                              color="secondary" 
                                            />
                                          )}
                                        </Box>
                                      }
                                      secondary={
                                        <Box>
                                          <Typography variant="body2" color="text.secondary">
                                            A: {email.to}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            {email.sentAt ? new Date(email.sentAt).toLocaleString('it-IT') : 'Data non disponibile'}
                                            {email.attachmentNames.length > 0 && ` • ${email.attachmentNames.length} allegato${email.attachmentNames.length > 1 ? 'i' : ''}`}
                                          </Typography>
                                        </Box>
                                      }
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </AccordionDetails>
                          </Accordion>
                        )}
                      </Box>
                    </Box>
                  );
                })()}
              </CardContent>
            </Card>
          </Collapse>

          {/* Advanced Search Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                endIcon={showAdvancedSearch ? <ExpandLess /> : <ExpandMore />}
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                sx={{ mb: showAdvancedSearch ? 2 : 0 }}
              >
                {showAdvancedSearch ? t('gmail.hideAdvancedSearch') : t('gmail.showAdvancedSearch')}
              </Button>

              <Collapse in={showAdvancedSearch}>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label={t('gmail.customKeywords')}
                    placeholder={t('gmail.customKeywordsPlaceholder')}
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    helperText={t('gmail.customKeywordsHelper')}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />

                  <Box>
                    <Typography variant="body2" gutterBottom>
                      {t('gmail.emailsToScan')}: {maxResults}
                    </Typography>
                    <Slider
                      value={maxResults}
                      onChange={(_, value) => setMaxResults(value as number)}
                      min={10}
                      max={100}
                      step={10}
                      marks={[
                        { value: 10, label: '10' },
                        { value: 50, label: '50' },
                        { value: 100, label: '100' },
                      ]}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" gutterBottom>
                      {t('gmail.searchPeriod')}: {t('gmail.lastDays', { days: daysBack })}
                    </Typography>
                    <Slider
                      value={daysBack}
                      onChange={(_, value) => setDaysBack(value as number)}
                      min={7}
                      max={90}
                      step={7}
                      marks={[
                        { value: 7, label: '1 sett' },
                        { value: 30, label: '1 mese' },
                        { value: 60, label: '2 mesi' },
                        { value: 90, label: '3 mesi' },
                      ]}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" gutterBottom>
                      {t('gmail.confidenceThreshold')}: {t('gmail.confidenceThresholdValue', { threshold: confidenceThreshold })}
                    </Typography>
                    <Slider
                      value={confidenceThreshold}
                      onChange={(_, value) => setConfidenceThreshold(value as number)}
                      min={0}
                      max={100}
                      step={5}
                      marks={[
                        { value: 0, label: '0%' },
                        { value: 50, label: '50%' },
                        { value: 80, label: '80%' },
                        { value: 100, label: '100%' },
                      ]}
                      valueLabelDisplay="auto"
                      color="secondary"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {t('gmail.confidenceThresholdHelper', { threshold: confidenceThreshold })}
                      {confidenceThreshold >= 80 && t('gmail.confidenceThresholdReliable')}
                      {confidenceThreshold >= 50 && confidenceThreshold < 80 && t('gmail.confidenceThresholdBalanced')}
                      {confidenceThreshold < 50 && t('gmail.confidenceThresholdUncertain')}
                    </Typography>
                  </Box>

                  <Alert severity="info" icon={<Search />}>
                    <strong>{t('gmail.searchTips')}</strong>
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      <li>{t('gmail.searchTip1')}</li>
                      <li>{t('gmail.searchTip2')}</li>
                      <li>{t('gmail.searchTip3')}</li>
                      <li>{t('gmail.searchTip4')}</li>
                    </ul>
                  </Alert>
                </Stack>
              </Collapse>

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<Refresh />}
                onClick={handleScanEmails}
                disabled={scanning}
                sx={{ mt: 2 }}
              >
                {scanning ? t('gmail.scanning') : t('gmail.scanEmails')}
              </Button>
            </CardContent>
          </Card>

          {scanning && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="body2" gutterBottom>
                  {t('gmail.scanningProgress', { current: scanProgress.current, total: scanProgress.total })}
                </Typography>
                <LinearProgress variant="determinate" value={(scanProgress.current / scanProgress.total) * 100} />
              </CardContent>
            </Card>
          )}

          {jobOffers.length > 0 && (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6">
                      {t('gmail.jobOffersFound')}
                    </Typography>
                    <Chip 
                      label={t('gmail.jobOffersShown', { filtered: filteredOffers.length, total: jobOffers.length })} 
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {filteredOffers.length > 0 && (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={selectedOffers.size === filteredOffers.length ? <CheckBox /> : <CheckBoxOutlineBlank />}
                          onClick={handleSelectAll}
                        >
                          {selectedOffers.size === filteredOffers.length ? t('gmail.deselectAll') : t('gmail.selectAll')}
                        </Button>
                        {selectedOffers.size > 0 && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<Download />}
                            onClick={handleBatchImport}
                            disabled={batchImporting}
                          >
                            {t('gmail.importSelected', { count: selectedOffers.size })}
                          </Button>
                        )}
                      </>
                    )}
                  </Box>
                </Box>
                {filteredOffers.length === 0 ? (
                  <Alert severity="warning">
                    {t('gmail.noOffersAboveThreshold', { threshold: confidenceThreshold })}
                  </Alert>
                ) : (
                  <List>
                    {filteredOffers.map((job) => (
                    <ListItem
                      key={job.emailId}
                      sx={{
                        border: '1px solid',
                        borderColor: selectedOffers.has(job.emailId) ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: selectedOffers.has(job.emailId) ? 'action.selected' : 'transparent',
                      }}
                      secondaryAction={
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleImportJob(job)}
                            color="info"
                          >
                            <Visibility />
                          </IconButton>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<Add />}
                            onClick={async () => {
                              // One-click import: directly import without preview dialog
                              if (currentUser) {
                                try {
                                  setImporting(true);
                                  const parseSalary = (salaryStr: string | undefined) => {
                                    if (!salaryStr) return { min: undefined, max: undefined };
                                    const numbers = salaryStr.match(/[\d,]+/g);
                                    if (numbers && numbers.length >= 2) {
                                      const min = parseInt(numbers[0].replace(/,/g, ''));
                                      const max = parseInt(numbers[1].replace(/,/g, ''));
                                      return { min, max };
                                    } else if (numbers && numbers.length === 1) {
                                      const salary = parseInt(numbers[0].replace(/,/g, ''));
                                      return { min: salary, max: undefined };
                                    }
                                    return { min: undefined, max: undefined };
                                  };
                                  
                                  const { min: salaryMin, max: salaryMax } = parseSalary(job.salary);

                                  const applicationData: ApplicationFormData = {
                                    company: job.company,
                                    jobTitle: job.jobTitle,
                                    location: job.location || '',
                                    isRemote: job.location?.toLowerCase().includes('remote') || false,
                                    jobUrl: job.jobUrl || '',
                                    jobDescription: job.jobDescription,
                                    ...(salaryMin !== undefined && { salaryMin }),
                                    ...(salaryMax !== undefined && { salaryMax }),
                                    salaryCurrency: 'EUR',
                                    source: 'email',
                                    status: 'saved',
                                    priority: 'medium',
                                    notes: `Imported from email: ${job.emailSubject}\nDate: ${job.emailDate.toLocaleDateString()}\nConfidence: ${job.confidence}%`,
                                    tags: ['email', 'imported'],
                                  };

                                  const applicationId = await createApplication(currentUser.uid, applicationData);
                                  GAEvents.createApplication('saved');
                                  await addToImportHistory(currentUser.uid, job, applicationId);

                                  // Remove from list
                                  const updatedOffers = jobOffers.filter(j => j.emailId !== job.emailId);
                                  setJobOffers(updatedOffers);
                                  applyConfidenceFilter(updatedOffers);

                                  await loadHistory();
                                  setImporting(false);
                                } catch (err: any) {
                                  console.error('Error one-click importing:', err);
                                  setError(err.message);
                                  setImporting(false);
                                }
                              }
                            }}
                            disabled={importing}
                          >
                            {importing ? t('gmail.importing') : t('gmail.import')}
                          </Button>
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <IconButton
                          edge="start"
                          onClick={() => handleToggleSelect(job.emailId)}
                        >
                          {selectedOffers.has(job.emailId) ? (
                            <CheckBox color="primary" />
                          ) : (
                            <CheckBoxOutlineBlank />
                          )}
                        </IconButton>
                      </ListItemAvatar>
                      <ListItemAvatar>
                        <Avatar>
                          <Work />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">{job.jobTitle}</Typography>
                            <Chip label={`${job.confidence}%`} size="small" color="primary" />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {job.company} {job.location && `• ${job.location}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {job.emailDate.toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Email Preview Dialog */}
      <Dialog 
        open={Boolean(emailPreview)} 
        onClose={() => setEmailPreview(null)} 
        maxWidth="md" 
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          📧 {t('gmail.emailPreview')}
          <IconButton
            onClick={() => setEmailPreview(null)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {emailPreview && (
            <Stack spacing={3}>
              {/* Job Offer Section */}
              <Box>
                <Typography variant="h6" color="primary" gutterBottom>
                  🎯 {t('gmail.jobOfferExtracted')}
                </Typography>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {emailPreview.job.jobTitle}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>{t('gmail.company')}:</strong> {emailPreview.job.company}
                    </Typography>
                    {emailPreview.job.location && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>{t('gmail.location')}:</strong> {emailPreview.job.location}
                      </Typography>
                    )}
                    {emailPreview.job.salary && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>{t('gmail.salary')}:</strong> {emailPreview.job.salary}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>{t('gmail.description')}:</strong>
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {emailPreview.job.jobDescription}
                    </Typography>
                    <Chip 
                      label={`${t('gmail.confidence')}: ${emailPreview.job.confidence}%`} 
                      size="small" 
                      color={emailPreview.job.confidence >= 80 ? 'success' : 'primary'} 
                    />
                  </CardContent>
                </Card>
              </Box>

              <Divider />

              {/* Original Email Section */}
              <Box>
                <Typography variant="h6" color="secondary" gutterBottom>
                  📨 {t('gmail.originalEmail')}
                </Typography>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>{t('gmail.subject')}:</strong> {emailPreview.email.subject}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>{t('gmail.from')}:</strong> {emailPreview.email.from}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>{t('gmail.date')}:</strong> {emailPreview.email.date.toLocaleString()}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                      <strong>{t('gmail.preview')}:</strong>
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxHeight: '400px', 
                        overflow: 'auto', 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        p: 1, 
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                      }}
                    >
                      {emailPreview.email.body || emailPreview.email.snippet || 'No content available'}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailPreview(null)}>{t('gmail.close')}</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (emailPreview) {
                setSelectedJob(emailPreview.job);
                setEmailPreview(null);
              }
            }}
            startIcon={<Add />}
          >
            {t('gmail.importJobOfferButton')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sent Email Preview Dialog */}
      <Dialog 
        open={sentEmailPreviewOpen} 
        onClose={() => {
          setSentEmailPreviewOpen(false);
          setSelectedSentEmail(null);
        }} 
        maxWidth="md" 
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          📧 {t('gmail.sentEmailPreview')}
          <IconButton
            onClick={() => {
              setSentEmailPreviewOpen(false);
              setSelectedSentEmail(null);
            }}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedSentEmail && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  <strong>{t('gmail.emailTo')}</strong>
                </Typography>
                <Typography variant="body1">
                  {selectedSentEmail.to}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  <strong>{t('gmail.emailSubject')}</strong>
                </Typography>
                <Typography variant="body1">
                  {selectedSentEmail.subject}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  <strong>{t('gmail.emailSentAt')}</strong>
                </Typography>
                <Typography variant="body2">
                  {selectedSentEmail.sentAt ? new Date(selectedSentEmail.sentAt).toLocaleString() : t('gmail.dateNotAvailable')}
                </Typography>
              </Box>
              {selectedSentEmail.attachmentNames.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      <strong>{t('gmail.emailAttachments')}</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {selectedSentEmail.attachmentNames.map((name, idx) => (
                        <Chip key={idx} label={name} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                </>
              )}
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  <strong>{t('gmail.emailBody')}</strong>
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mt: 1,
                    p: 2, 
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedSentEmail.body}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSentEmailPreviewOpen(false);
            setSelectedSentEmail(null);
          }}>
            {t('gmail.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Confirmation Dialog */}
      <Dialog open={Boolean(selectedJob)} onClose={() => setSelectedJob(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('gmail.importJobOffer')}
          <IconButton
            onClick={() => setSelectedJob(null)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedJob && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedJob.jobTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>{t('gmail.company')}:</strong> {selectedJob.company}
              </Typography>
              {selectedJob.location && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>{t('gmail.location')}:</strong> {selectedJob.location}
                </Typography>
              )}
              {selectedJob.salary && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>{t('gmail.salary')}:</strong> {selectedJob.salary}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>{t('gmail.description')}:</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                {selectedJob.jobDescription}
              </Typography>
              <Chip label={`${t('gmail.confidence')}: ${selectedJob.confidence}%`} size="small" color="primary" />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedJob(null)}>{t('gmail.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleConfirmImport}
            disabled={importing}
            startIcon={importing ? <CircularProgress size={20} /> : <Add />}
          >
            {t('gmail.import')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GmailIntegration;

