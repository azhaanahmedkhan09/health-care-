import React, { useMemo, useState } from 'react';
import {
  Compass,
  Filter,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HospitalCard } from '../components/HospitalCard';

export const HospitalSearchPage: React.FC = () => {
  const {
    user,
    hospitals,
    services,
    navigate,
    setSelectedHospitalId,
    setPreselectedServiceId,
    setPreselectedHospitalId,
    setPreselectedArea,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('ALL');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [selectedServiceId, setSelectedServiceId] = useState('ALL');
  const [selectedCapacity, setSelectedCapacity] = useState('ALL');
  const [selectedAcceptance, setSelectedAcceptance] = useState('ALL');
  const [sortBy, setSortBy] = useState<'distance' | 'freshness' | 'name'>('distance');

  const distinctAreas = useMemo(() => {
    return Array.from(new Set(hospitals.map((h) => h.area)));
  }, [hospitals]);

  const distinctSpecialties = useMemo(() => {
    return Array.from(new Set(services.map((s) => s.category)));
  }, [services]);

  const filteredHospitals = useMemo(() => {
    const result = hospitals.filter((h) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesNameOrArea =
          h.name.toLowerCase().includes(q) ||
          h.area.toLowerCase().includes(q) ||
          h.address.toLowerCase().includes(q) ||
          h.services.some(
            (s) =>
              s.serviceName.toLowerCase().includes(q) ||
              s.serviceCategory.toLowerCase().includes(q)
          );
        if (!matchesNameOrArea) return false;
      }

      if (selectedArea !== 'ALL' && h.area !== selectedArea) {
        return false;
      }

      if (selectedSpecialty !== 'ALL') {
        const hasSpec =
          h.specialties.includes(selectedSpecialty) ||
          h.services.some((s) => s.serviceCategory === selectedSpecialty);
        if (!hasSpec) return false;
      }

      if (selectedServiceId !== 'ALL') {
        const hasSvc = h.services.some((s) => s.serviceId === selectedServiceId);
        if (!hasSvc) return false;
      }

      if (selectedCapacity !== 'ALL') {
        if (selectedServiceId !== 'ALL') {
          const targetSvc = h.services.find((s) => s.serviceId === selectedServiceId);
          if (!targetSvc || targetSvc.capacityStatus !== selectedCapacity) return false;
        } else {
          const anyMatchesCap = h.services.some((s) => s.capacityStatus === selectedCapacity);
          if (!anyMatchesCap) return false;
        }
      }

      if (selectedAcceptance !== 'ALL' && h.referralAcceptance !== selectedAcceptance) {
        return false;
      }

      return true;
    });

    return [...result].sort((a, b) => {
      if (sortBy === 'distance') return a.distanceKm - b.distanceKm;
      if (sortBy === 'freshness') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return a.name.localeCompare(b.name);
    });
  }, [
    hospitals,
    searchQuery,
    selectedArea,
    selectedSpecialty,
    selectedServiceId,
    selectedCapacity,
    selectedAcceptance,
    sortBy,
  ]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedArea('ALL');
    setSelectedSpecialty('ALL');
    setSelectedServiceId('ALL');
    setSelectedCapacity('ALL');
    setSelectedAcceptance('ALL');
    setSortBy('distance');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-sky-700 mb-1">
            Regional Service & Capacity Directory · Davangere, Karnataka (Fictional Demo)
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            Hospital Search & Capacity Verification
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            if (selectedServiceId !== 'ALL') {
              setPreselectedServiceId(selectedServiceId);
            }
            if (selectedArea !== 'ALL') {
              setPreselectedArea(selectedArea);
            }
            navigate('MATCHED_RESULTS');
          }}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Compass className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Run 3-Step Matching Engine</span>
        </button>
      </div>

      {/* Search & Multi-Criterion Filter Panel */}
      <section
        aria-label="Hospital Search Filters"
        className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Hospital / Service Search Input */}
          <div className="md:col-span-5">
            <label
              htmlFor="hospital-search-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Hospital Name, Specialty, or Area
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                id="hospital-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., Bapuji, PJ Extension, Cardiology, MRI..."
                className="w-full pl-10 pr-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          {/* Required Medical Service Filter */}
          <div className="md:col-span-4">
            <label
              htmlFor="filter-service"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Required Medical Service
            </label>
            <select
              id="filter-service"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
            >
              <option value="ALL">All Listed Services (8 Categories)</option>
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.category} — {svc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location / Area Filter */}
          <div className="md:col-span-3">
            <label
              htmlFor="filter-area"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Davangere Area / Corridor
            </label>
            <select
              id="filter-area"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
            >
              <option value="ALL">All Areas in Davangere</option>
              {distinctAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Second Filter Row: Specialty, Capacity, Referral Acceptance, Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label
              htmlFor="filter-specialty"
              className="block text-[11px] font-semibold text-slate-600 mb-1"
            >
              Medical Specialty
            </label>
            <select
              id="filter-specialty"
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Specialties</option>
              {distinctSpecialties.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-capacity"
              className="block text-[11px] font-semibold text-slate-600 mb-1"
            >
              Reported Capacity Status
            </label>
            <select
              id="filter-capacity"
              value={selectedCapacity}
              onChange={(e) => setSelectedCapacity(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">Any Capacity Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="LIMITED">Limited Capacity</option>
              <option value="UNCONFIRMED">Unconfirmed</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-acceptance"
              className="block text-[11px] font-semibold text-slate-600 mb-1"
            >
              Referral Acceptance Status
            </label>
            <select
              id="filter-acceptance"
              value={selectedAcceptance}
              onChange={(e) => setSelectedAcceptance(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">Any Acceptance Status</option>
              <option value="ACCEPTING">Accepting Referrals</option>
              <option value="LIMITED_REVIEW">Coordinator Review Required</option>
              <option value="NOT_ACCEPTING">Not Accepting Referrals</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="sort-hospitals"
              className="block text-[11px] font-semibold text-slate-600 mb-1"
            >
              Sort Results By
            </label>
            <select
              id="sort-hospitals"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'distance' | 'freshness' | 'name')
              }
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="distance">Proximity (Distance Band)</option>
              <option value="freshness">Freshness (Most Recently Updated)</option>
              <option value="name">Hospital Name (A–Z)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      </section>

      {/* Results Count Bar */}
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Filter className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
          <span>
            Showing <strong className="font-mono tabular-nums">{filteredHospitals.length}</strong> of{' '}
            <strong className="font-mono tabular-nums">{hospitals.length}</strong> fictional
            demonstration hospitals in Davangere
          </span>
        </span>
        <span className="text-slate-500 hidden sm:inline">
          Reported capacity reflects coordinator updates, not guaranteed bed availability
        </span>
      </div>

      {/* Results Grid */}
      {filteredHospitals.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <p className="text-base font-display font-bold text-slate-900">
            No hospitals match your current filter combination
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try clearing the area or capacity filter, or run the 3-Step Matching Engine to see
            nearest alternative hospitals across Davangere.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
          >
            Reset Search Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredHospitals.map((hospital) => (
            <HospitalCard
              key={hospital.id}
              hospital={hospital}
              highlightedServiceId={selectedServiceId}
              showSendReferral={user?.role !== 'HOSPITAL_COORDINATOR'}
              onViewDetails={(id) => {
                setSelectedHospitalId(id);
                navigate('HOSPITAL_DETAILS');
              }}
              onSendReferral={(hospId, svcId) => {
                setPreselectedHospitalId(hospId);
                if (svcId) setPreselectedServiceId(svcId);
                navigate('CREATE_REFERRAL');
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
