import React, { useState, useEffect, useRef } from "react";
import { X, ChevronDown, MapPin } from "lucide-react";
import { filterCities } from "../data/greeceCities";

interface CitySelectProps {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;

  allowCustom?: boolean;
  className?: string;
}

export const CitySelect: React.FC<CitySelectProps> = ({
  value,
  onChange,
  placeholder = "Επιλέξτε ή πληκτρολογήστε πόλη...",
  disabled = false,
  error,
  label,

  allowCustom = true,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || "");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCities = filterCities(searchQuery);

  // Keep internal search query in sync with external value prop
  useEffect(() => {
    setSearchQuery(value || "");
  }, [value]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setSearchQuery(text);
    setIsOpen(true);

    if (allowCustom) {
      onChange(text);
    }
  };

  const handleSelectCity = (city: string) => {
    setSearchQuery(city);
    onChange(city);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery("");
    onChange("");
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <MapPin className="w-4 h-4 text-sky-500" />
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-9 pr-16 py-2 border rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors ${
            error
              ? "border-red-300 bg-red-50 focus:border-red-500"
              : "border-slate-200 focus:border-blue-500"
          } ${disabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white text-slate-900"}`}
        />

        <div className="absolute inset-y-0 right-0 pr-2 flex items-center space-x-1">
          {searchQuery && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 transition-colors"
              title="Καθαρισμός"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            disabled={disabled}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-200 max-h-60 overflow-y-auto divide-y divide-slate-100 py-1 text-sm">
          {filteredCities.length > 0 ? (
            filteredCities.map((city) => {
              const isSelected = value?.toUpperCase() === city.toUpperCase();
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleSelectCity(city)}
                  className={`w-full text-left px-4 py-2 hover:bg-sky-50 hover:text-sky-800 transition-colors flex items-center justify-between ${
                    isSelected ? "bg-sky-100 text-sky-900 font-semibold" : "text-slate-700"
                  }`}
                >
                  <span>{city}</span>
                  {isSelected && <span className="text-xs text-blue-600 font-medium">Επιλεγμένο</span>}
                </button>
              );
            })
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">
              {allowCustom && searchQuery.trim() ? (
                <div>
                  <p className="mb-1 text-slate-600">Δεν βρέθηκε η πόλη στη λίστα.</p>
                  <button
                    type="button"
                    onClick={() => handleSelectCity(searchQuery.trim().toUpperCase())}
                    className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                  >
                    Χρήση: "{searchQuery.trim().toUpperCase()}"
                  </button>
                </div>
              ) : (
                "Δεν βρέθηκαν αποτελέσματα"
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
