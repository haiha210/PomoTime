import { type ChangeEvent } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { isValidIsoDate } from "../utils/dateTime";

type PickerType = "date" | "time" | "datetime-local";

interface NativePickerInputProps {
  type: PickerType;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

function toIsoDateLocal(value: Date): string {
  const year = String(value.getFullYear());
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toHHmm(value: Date): string {
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function toDateTimeLocal(value: Date): string {
  return `${toIsoDateLocal(value)}T${toHHmm(value)}`;
}

function parseIsoDateLocal(value: string): Date | null {
  if (!isValidIsoDate(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map((part) => Number(part));
  return new Date(year, month - 1, day);
}

function parseHHmm(value: string): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  const parsed = new Date();
  parsed.setHours(hours, minutes, 0, 0);
  return parsed;
}

function parseDateTimeLocal(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function emitChange(onChange: NativePickerInputProps["onChange"], nextValue: string): void {
  onChange({ target: { value: nextValue } } as ChangeEvent<HTMLInputElement>);
}

export function NativePickerInput({
  type,
  value,
  onChange,
  id,
  name,
  disabled,
  required,
  placeholder,
}: NativePickerInputProps): React.JSX.Element {
  const baseProps = {
    id,
    name,
    disabled,
    required,
    portalId: "learn-time-datepicker-portal",
    popperClassName: "learn-time-datepicker-popper",
    className: "learn-time-picker-input",
    autoComplete: "off",
  };

  if (type === "time") {
    return (
      <DatePicker
        {...baseProps}
        selected={parseHHmm(value)}
        onChange={(nextValue: Date | null) => emitChange(onChange, nextValue ? toHHmm(nextValue) : "")}
        showTimeSelect
        showTimeSelectOnly
        timeIntervals={5}
        shouldCloseOnSelect
        dateFormat="HH:mm"
        timeCaption="Time"
        placeholderText={placeholder || "HH:mm"}
      />
    );
  }

  if (type === "datetime-local") {
    return (
      <DatePicker
        {...baseProps}
        selected={parseDateTimeLocal(value)}
        onChange={(nextValue: Date | null) => emitChange(onChange, nextValue ? toDateTimeLocal(nextValue) : "")}
        showTimeSelect
        timeIntervals={5}
        shouldCloseOnSelect
        dateFormat="yyyy-MM-dd HH:mm"
        placeholderText={placeholder || "YYYY-MM-DD HH:mm"}
      />
    );
  }

  return (
    <DatePicker
      {...baseProps}
      selected={parseIsoDateLocal(value)}
      onChange={(nextValue: Date | null) => emitChange(onChange, nextValue ? toIsoDateLocal(nextValue) : "")}
      shouldCloseOnSelect
      dateFormat="yyyy-MM-dd"
      placeholderText={placeholder || "YYYY-MM-DD"}
    />
  );
}