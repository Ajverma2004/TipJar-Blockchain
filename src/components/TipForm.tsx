
import React, {useState} from 'react';
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";

interface TipFormProps {
  onSubmit: (name: string, phone: string, amount: number) => void;
  selectedStaff: string;
}

const TipForm: React.FC<TipFormProps> = ({onSubmit, selectedStaff}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number | ''>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && phone && amount) {
      onSubmit(name, phone, Number(amount));
      setName('');
      setPhone('');
      setAmount('');
    }
  };

  const handlePresetAmount = (presetAmount: number) => {
    setAmount(presetAmount);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Tip {selectedStaff}</h2>
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <div>
          <Label htmlFor="name">Your Name</Label>
          <Input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
          />
        </div>
        <div>
          <Label>Tip Amount (£)</Label>
          <div className="flex space-x-2 mt-1">
            <Button type="button" variant="outline" onClick={() => handlePresetAmount(5)}>5</Button>
            <Button type="button" variant="outline" onClick={() => handlePresetAmount(10)}>10</Button>
            <Button type="button" variant="outline" onClick={() => handlePresetAmount(15)}>15</Button>
            <Input
              type="number"
              placeholder="Custom Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>
        <Button type="submit">Submit Tip</Button>
      </form>
    </div>
  );
};

export default TipForm;
