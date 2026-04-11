'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Campaign, AdCopy } from '@/types/campaign';

interface AdCopySelectProps {
  value?: string;
  onSelect: (adCopyId: string, adCopyName: string) => void;
  campaigns: Campaign[];
  selectedCampaignId?: string;
}

export function AdCopySelect({ value, onSelect, campaigns, selectedCampaignId }: AdCopySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [manualMode, setManualMode] = React.useState(false);
  const [manualInput, setManualInput] = React.useState('');

  // Get ad copies for the selected campaign
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
  const adCopies = selectedCampaign?.adCopies || [];

  const options = [
    { label: 'No Ad Copy', value: '', adId: '' },
    ...adCopies.map(ac => ({ label: ac.name, value: ac.id, adId: ac.adId })),
  ];

  const selectedOption = options.find(opt => opt.value === value);
  const selectedLabel = selectedOption?.label || 'Select ad copy...';

  // Check if current value is a manual entry (not in options)
  const isManualEntry = value && !options.find(opt => opt.value === value);

  React.useEffect(() => {
    if (isManualEntry) {
      setManualInput(value);
      setManualMode(true);
    }
  }, [value, isManualEntry]);

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onSelect(manualInput.trim(), `Manual: ${manualInput.trim()}`);
      setManualMode(false);
    }
  };

  const handleOptionSelect = (optionValue: string, optionLabel: string) => {
    onSelect(optionValue, optionLabel);
    setOpen(false);
    setManualMode(false);
  };

  if (manualMode) {
    return (
      <div className="flex gap-1">
        <Input
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="Enter ad copy ID manually..."
          className="bg-slate-950 border-slate-700 text-white text-sm h-8 flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleManualSubmit();
            } else if (e.key === 'Escape') {
              setManualMode(false);
              setManualInput('');
            }
          }}
        />
        <Button
          onClick={handleManualSubmit}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 h-8 px-2"
        >
          <Check size={14} />
        </Button>
        <Button
          onClick={() => {
            setManualMode(false);
            setManualInput('');
          }}
          variant="outline"
          size="sm"
          className="border-slate-700 text-slate-300 hover:bg-slate-800 h-8 px-2"
        >
          ×
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between bg-slate-950 border-slate-700 text-white hover:bg-slate-900 text-sm h-8"
          >
            <span className="truncate">
              {isManualEntry ? `Manual: ${value}` : selectedLabel}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-slate-900 border-slate-700">
          <Command className="bg-slate-950">
            <CommandInput placeholder="Search ad copies..." className="text-white" />
            <CommandEmpty className="text-slate-400">
              {!selectedCampaignId 
                ? 'Select a campaign first' 
                : 'No ad copies found for this campaign.'
              }
            </CommandEmpty>
            <CommandList>
              <CommandGroup className="overflow-auto">
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleOptionSelect(option.value, option.label)}
                    className="text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {option.label}
                    {option.adId && (
                      <span className="ml-2 text-xs text-slate-500">({option.adId})</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button
        onClick={() => setManualMode(true)}
        variant="outline"
        size="sm"
        className="border-slate-700 text-slate-300 hover:bg-slate-800 h-8 px-2"
        title="Enter ad copy ID manually"
      >
        <Edit3 size={14} />
      </Button>
    </div>
  );
}
