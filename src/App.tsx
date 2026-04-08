import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Cigarette, Leaf } from "lucide-react";
import { CounterCard } from "@/components/CounterCard";
import { CalendarView } from "@/components/CalendarView";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateGMT3, getTodayKeyGMT3 } from "@/lib/date-utils";

interface DayData {
  date: string;
  cigarette: number;
  leaf: number;
}

const App = () => {
  const [data, setData] = useState<Record<string, DayData>>({});
  const today = getTodayKeyGMT3();

  useEffect(() => {
    const stored = localStorage.getItem('smoking-tracker');
    if (stored) {
      setData(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (Object.keys(data).length > 0) {
      localStorage.setItem('smoking-tracker', JSON.stringify(data));
    }
  }, [data]);

  const incrementCount = (type: 'cigarette' | 'leaf') => {
    setData((prev) => {
      const todayData = prev[today] || { date: today, cigarette: 0, leaf: 0 };
      const newCount = todayData[type] + 1;

      toast.success(`+1 ${type === 'cigarette' ? 'cigarro' : 'folha'}`, {
        description: `Total hoje: ${newCount}`,
        duration: 2000,
      });

      return {
        ...prev,
        [today]: {
          ...todayData,
          [type]: newCount,
        },
      };
    });
  };

  const resetCount = (type: 'cigarette' | 'leaf') => {
    setData((prev) => {
      const todayData = prev[today] || { date: today, cigarette: 0, leaf: 0 };

      toast.info(`Contador ${type === 'cigarette' ? 'cigarro' : 'folha'} zerado`, {
        description: 'Contagem de hoje reiniciada',
        duration: 2000,
      });

      return {
        ...prev,
        [today]: {
          ...todayData,
          [type]: 0,
        },
      };
    });
  };

  /* Dialog State */
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [cigaretteCount, setCigaretteCount] = useState(0);
  const [leafCount, setLeafCount] = useState(0);

  const openEditDialog = (dateStr: string) => {
    const dayData = data[dateStr] || { date: dateStr, cigarette: 0, leaf: 0 };
    setSelectedDate(dateStr);
    setCigaretteCount(dayData.cigarette);
    setLeafCount(dayData.leaf);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (selectedDate) {
      setData((prev) => ({
        ...prev,
        [selectedDate]: {
          date: selectedDate,
          cigarette: Number(cigaretteCount),
          leaf: Number(leafCount)
        }
      }));
      toast.success('Dados atualizados com sucesso!');
      setIsDialogOpen(false);
    }
  };

  const todayData = data[today] || { date: today, cigarette: 0, leaf: 0 };

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
          <header className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-2">
              Smoking Tracker
            </h1>
            <p className="text-muted-foreground">do but don't forget</p>
          </header>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-8">
            <CounterCard
              icon={Cigarette}
              label="Cigarro"
              count={todayData.cigarette}
              variant="cigarette"
              onClick={() => incrementCount('cigarette')}
              onReset={() => resetCount('cigarette')}
            />
            <CounterCard
              icon={Leaf}
              label="Folha"
              count={todayData.leaf}
              variant="leaf"
              onClick={() => incrementCount('leaf')}
              onReset={() => resetCount('leaf')}
            />
          </div>

          <CalendarView
            data={data}
            onDayClick={(date) => openEditDialog(date)}
          />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar dia {selectedDate ? formatDateGMT3(new Date(selectedDate), 'dd/MM/yyyy') : ''}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cigarette" className="text-right">
                  Cigarro
                </Label>
                <Input
                  id="cigarette"
                  type="number"
                  value={cigaretteCount}
                  onChange={(e) => setCigaretteCount(Number(e.target.value))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="leaf" className="text-right">
                  Folha
                </Label>
                <Input
                  id="leaf"
                  type="number"
                  value={leafCount}
                  onChange={(e) => setLeafCount(Number(e.target.value))}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleSave}>Salvar alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default App;
