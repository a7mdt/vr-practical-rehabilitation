import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Activity, Check } from 'lucide-react';
import { exercises } from '../exercises';

export default function ExerciseSelector({ selectedExercise, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedData = exercises[selectedExercise] || Object.values(exercises)[0];

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Top Label */}
      <div className="absolute -top-6 left-2">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
          Exercise
        </span>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-5 py-4 bg-white border border-black/8 rounded-2xl shadow-sm hover:shadow-md hover:border-black/15 transition-all cursor-pointer group"
      >

        <div className="flex items-center gap-3">
          {/* <Activity size={18} className="text-brand-primary opacity-60" /> */}
          <span className="text-sm font-bold text-gray-800">
            {selectedData.name}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <ChevronDown size={18} className="text-gray-400" />
        </motion.div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-[100] top-full left-0 w-full bg-white border border-black/8 rounded-2xl shadow-2xl overflow-hidden py-2"
          >
            <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
            {Object.values(exercises).filter(ex => ex.id !== 'deadBug' && ex.id !== 'birdDog').map((ex) => {
              const isSelected = ex.id === selectedExercise;
              return (
                <button
                  key={ex.id}
                  onClick={() => {
                    onSelect(ex.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-5 py-4 text-left transition-colors cursor-pointer border-none
                    ${isSelected 
                      ? 'bg-brand-primary/8 text-brand-primary' 
                      : 'bg-transparent text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <span className={`text-sm ${isSelected ? 'font-black' : 'font-bold'}`}>
                    {ex.name}
                  </span>
                  {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <Check size={16} className="text-brand-primary" strokeWidth={3} />
                    </motion.div>
                  )}
                </button>
              );
            })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
