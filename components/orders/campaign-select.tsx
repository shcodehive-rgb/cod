'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { Campaign } from '@/types/campaign';

interface CampaignSelectProps {
  value: string;
  onSelect: (campaignId: string) => void;
  campaigns: Campaign[];
}

export function CampaignSelect({ value, onSelect, campaigns }: CampaignSelectProps) {
  const [open, setOpen] = React.useState(false);

  const options = [
    { label: 'Organic', value: 'Organic' },
    ...campaigns.map(c => ({ label: c.name, value: c.id })),
  ];

  const selectedLabel = options.find(opt => opt.value === value)?.label || 'Select source...';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-slate-950 border-slate-700 text-white hover:bg-slate-900 text-sm h-8"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-slate-900 border-slate-700">
        <Command className="bg-slate-950">
          <CommandInput placeholder="Search campaigns..." className="text-white" />
          <CommandEmpty className="text-slate-400">No campaign found.</CommandEmpty>
          <CommandList>
            <CommandGroup className="overflow-auto">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onSelect(currentValue);
                    setOpen(false);
                  }}
                  className="text-white hover:bg-slate-800 cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
