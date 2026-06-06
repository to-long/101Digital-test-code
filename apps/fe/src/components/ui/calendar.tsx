import { DayPicker, useDayPicker, type DayPickerProps } from 'react-day-picker';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-day-picker/style.css';

export type CalendarProps = DayPickerProps;

// Custom caption that bundles the month label + nav buttons together,
// so the chevrons sit immediately to the right of "June 2026".
function MonthCaption({ calendarMonth }: { calendarMonth: { date: Date } }) {
  const { previousMonth, nextMonth, goToMonth } = useDayPicker();
  return (
    <div className="flex items-center gap-2 h-8">
      <span className="text-[13px] font-semibold">
        {format(calendarMonth.date, 'MMMM yyyy')}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          disabled={!previousMonth}
          onClick={() => previousMonth && goToMonth(previousMonth)}
          aria-label="Previous month"
          className="inline-flex items-center justify-center h-6 w-6 rounded-md text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={!nextMonth}
          onClick={() => nextMonth && goToMonth(nextMonth)}
          aria-label="Next month"
          className="inline-flex items-center justify-center h-6 w-6 rounded-md text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function Calendar(props: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays
      {...props}
      components={{
        // Hide the default detached nav — our MonthCaption renders its own buttons.
        Nav: () => <span className="hidden" />,
        MonthCaption,
        ...props.components,
      }}
      classNames={{
        root: 'rdp p-0',
        months: 'flex',
        month: 'space-y-2',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-8 text-[10px] font-medium text-gray-500 uppercase',
        week: 'flex w-full',
        // overflow-hidden lets the range bar span the full cell without gaps.
        day: 'p-0 h-8 w-8 text-center text-[12px] overflow-hidden',
        day_button:
          'h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer transition-colors',
        today: 'font-bold text-blue-600',
        outside: 'text-gray-300',
        disabled: 'opacity-40 cursor-not-allowed',
        // `selected` is applied to every day in a range; leave empty so the
        // specific range_* styles below own their look.
        selected: '',
        range_start:
          '[&_button]:!bg-blue-500 [&_button]:!text-white [&_button]:hover:!bg-blue-600 [&_button]:!rounded-l-full [&_button]:!rounded-r-none',
        range_end:
          '[&_button]:!bg-blue-500 [&_button]:!text-white [&_button]:hover:!bg-blue-600 [&_button]:!rounded-r-full [&_button]:!rounded-l-none',
        range_middle:
          '[&_button]:!bg-blue-100 [&_button]:!text-blue-900 [&_button]:hover:!bg-blue-200 [&_button]:!rounded-none',
        ...props.classNames,
      }}
      modifiersClassNames={{
        // Single-day range — render as a full circle, not a half-pill.
        range_start_end: '[&_button]:!rounded-full',
        ...props.modifiersClassNames,
      }}
    />
  );
}
