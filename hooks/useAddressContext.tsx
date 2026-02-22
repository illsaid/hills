'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { isInHillsBoundary } from '@/lib/geo/hillsBoundary';

export type VerificationStatus = 'none' | 'unverified' | 'verified';

interface WatchAddress {
    id: string;
    label: string | null;
    address_text: string;
    lat: number;
    lon: number;
}

interface AddressContextValue {
    address: WatchAddress | null;
    lat: number | null;
    lon: number | null;
    radius_m: number;
    window_days: number;
    addresses: WatchAddress[];
    verificationStatus: VerificationStatus;
    setAddress: (address: WatchAddress | null) => void;
    setRadius: (radius: number) => void;
    setWindowDays: (days: number) => void;
    addAddress: (address: Omit<WatchAddress, 'id'>) => void;
    useDemoAddress: () => void;
    clearAddress: () => void;
}

const AddressContext = createContext<AddressContextValue | undefined>(undefined);

const DEMO_ADDRESS: WatchAddress = {
    id: 'demo',
    label: 'Demo: Hollywood Hills',
    address_text: 'Hollywood Hills, Los Angeles, CA',
    lat: 34.12,
    lon: -118.345,
};

interface AddressProviderProps {
    children: ReactNode;
}

export function AddressProvider({ children }: AddressProviderProps) {
    const [address, setAddressState] = useState<WatchAddress | null>(null);
    const [addresses, setAddresses] = useState<WatchAddress[]>([DEMO_ADDRESS]);
    const [radius_m, setRadiusState] = useState(500);
    const [window_days, setWindowDaysState] = useState(90);
    const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('none');

    useEffect(() => {
        if (!address) {
            setVerificationStatus('none');
            return;
        }
        const inBounds = isInHillsBoundary(address.lat, address.lon);
        setVerificationStatus(inBounds ? 'verified' : 'unverified');
    }, [address]);

    const setAddress = useCallback((addr: WatchAddress | null) => {
        setAddressState(addr);
    }, []);

    const setRadius = useCallback((radius: number) => {
        setRadiusState(radius);
    }, []);

    const setWindowDays = useCallback((days: number) => {
        setWindowDaysState(days);
    }, []);

    const addAddress = useCallback((newAddr: Omit<WatchAddress, 'id'>) => {
        const id = `addr-${Date.now()}`;
        const addr: WatchAddress = { id, ...newAddr };
        setAddresses(prev => [...prev, addr]);
        setAddressState(addr);
    }, []);

    const useDemoAddress = useCallback(() => {
        setAddressState(DEMO_ADDRESS);
    }, []);

    const clearAddress = useCallback(() => {
        setAddressState(null);
    }, []);

    return (
        <AddressContext.Provider
            value={{
                address,
                lat: address?.lat ?? null,
                lon: address?.lon ?? null,
                radius_m,
                window_days,
                addresses,
                verificationStatus,
                setAddress,
                setRadius,
                setWindowDays,
                addAddress,
                useDemoAddress,
                clearAddress,
            }}
        >
            {children}
        </AddressContext.Provider>
    );
}

export function useAddressContext(): AddressContextValue {
    const context = useContext(AddressContext);
    if (!context) {
        throw new Error('useAddressContext must be used within an AddressProvider');
    }
    return context;
}
