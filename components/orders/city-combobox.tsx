'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { OZONE_CITIES } from '@/data/cities';

interface CityComboboxProps {
  value: string;
  onSelect: (city: string) => void;
}

export function CityCombobox({ value, onSelect }: CityComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-900 hover:text-slate-100"
        >
          <span className="truncate">
            {value ? value : 'Select city...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-slate-900 border-slate-800">
        <Command className="bg-slate-900">
          <CommandInput
            placeholder="Search cities..."
            className="border-slate-700 text-white placeholder:text-slate-500"
          />
          <CommandEmpty className="text-slate-400 py-2 px-4">No city found.</CommandEmpty>
          <CommandList>
            <CommandGroup className="overflow-visible">
              {OZONE_CITIES.map((city) => (
                <CommandItem
                  key={city.name}
                  value={city.name}
                  onSelect={() => {
                    onSelect(city.name);
                    setOpen(false);
                  }}
                  className="cursor-pointer hover:bg-slate-800 text-slate-200 focus:bg-slate-800 focus:text-white"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === city.name ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {city.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
