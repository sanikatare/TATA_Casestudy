import React, { createContext, useContext, useState, useEffect } from 'react';

export interface EcuDomainItem {
  id: string;
  label: string;
  match: string;
}

export const ECU_DOMAINS: EcuDomainItem[] = [
  { id: 'ALL', label: 'All ECU Domains', match: '' },
  { id: 'Powertrain', label: 'Powertrain Domain', match: 'Powertrain' },
  { id: 'Gateway', label: 'Zonal Gateway', match: 'Gateway' },
  { id: 'Body', label: 'Body Domain', match: 'Body' },
  { id: 'EV_BMS', label: 'EV & BMS Safety', match: 'BMS' },
];

export type EcuDomainId = string;

interface DomainContextType {
  selectedDomain: EcuDomainId;
  setSelectedDomain: (domain: EcuDomainId) => void;
  domainLabel: string;
}

const DomainContext = createContext<DomainContextType>({
  selectedDomain: 'ALL',
  setSelectedDomain: () => {},
  domainLabel: 'All ECU Domains',
});

export const DomainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDomain, setSelectedDomainState] = useState<EcuDomainId>(() => {
    return (localStorage.getItem('autosar_selected_domain') as EcuDomainId) || 'ALL';
  });

  const setSelectedDomain = (dom: EcuDomainId) => {
    setSelectedDomainState(dom);
    localStorage.setItem('autosar_selected_domain', dom);
  };

  const domainObj = ECU_DOMAINS.find(d => d.id === selectedDomain);
  const domainLabel = domainObj?.label || 'All ECU Domains';

  return (
    <DomainContext.Provider value={{ selectedDomain, setSelectedDomain, domainLabel }}>
      {children}
    </DomainContext.Provider>
  );
};

export const useDomain = () => useContext(DomainContext);
