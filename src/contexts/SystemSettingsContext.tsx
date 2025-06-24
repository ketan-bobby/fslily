
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getAppearanceSettings } from '@/lib/db';
import type { AppearanceSettings } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface SystemSettings {
    organizationName?: string;
    logoUrl?: string;
}

interface SystemSettingsContextType {
    settings: SystemSettings | null;
    isLoading: boolean;
    updateSettings: (newSettings: Partial<SystemSettings>) => void;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch only appearance settings as they now contain both name and logo
            const appearance = await getAppearanceSettings();
            
            const newSettings: SystemSettings = {
                organizationName: appearance?.organizationName,
                logoUrl: appearance?.logoUrl
            };
            setSettings(newSettings);

        } catch (error) {
            console.error("Failed to fetch system settings for context:", error);
            // Set default settings on error so the app doesn't break
            setSettings({ organizationName: "IntelliAssistant", logoUrl: undefined });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const updateSettings = (newSettings: Partial<SystemSettings>) => {
        setSettings(prev => ({ ...(prev || {}), ...newSettings }));
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading system settings...</p>
            </div>
        );
    }

    return (
        <SystemSettingsContext.Provider value={{ settings, isLoading, updateSettings }}>
            {children}
        </SystemSettingsContext.Provider>
    );
};

export const useSystemSettings = () => {
    const context = useContext(SystemSettingsContext);
    if (context === undefined) {
        throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
    }
    return context;
};
