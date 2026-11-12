import { prisma } from "./prisma";

// Generate array of time slots between start and end time
export function generateTimeSlots(
  startTime: string = "10:00",
  endTime: string = "17:00",
  durationMinutes: number = 30
): { startTime: string; endTime: string; label: string }[] {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const finishMinutes = endHour * 60 + endMin;

  const slots: { startTime: string; endTime: string; label: string }[] = [];

  while (currentMinutes + durationMinutes <= finishMinutes) {
    const slotStartH = Math.floor(currentMinutes / 60);
    const slotStartM = currentMinutes % 60;

    const nextMinutes = currentMinutes + durationMinutes;
    const slotEndH = Math.floor(nextMinutes / 60);
    const slotEndM = nextMinutes % 60;

    // Optional lunch break skip (1:00 PM - 2:00 PM = 780 to 840)
    if (currentMinutes >= 780 && currentMinutes < 840) {
      currentMinutes = nextMinutes;
      continue;
    }

    const formatTime = (h: number, m: number) => {
      const period = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const displayM = m.toString().padStart(2, "0");
      return `${displayH}:${displayM} ${period}`;
    };

    const label = `${formatTime(slotStartH, slotStartM)} - ${formatTime(slotEndH, slotEndM)}`;
    const startIso = `${slotStartH.toString().padStart(2, "0")}:${slotStartM.toString().padStart(2, "0")}`;
    const endIso = `${slotEndH.toString().padStart(2, "0")}:${slotEndM.toString().padStart(2, "0")}`;

    slots.push({
      startTime: startIso,
      endTime: endIso,
      label,
    });

    currentMinutes = nextMinutes;
  }

  return slots;
}

// Fetch available slots for a given date
export async function getAvailableSlotsForDate(dateStr: string) {
  const settings = await prisma.appSettings.findFirst();
  const allSlots = generateTimeSlots(
    settings?.dailyStartTime || "10:00",
    settings?.dailyEndTime || "17:00",
    settings?.slotDurationMinutes || 30
  );

  // Find all active bookings on that date
  const bookedOnDate = await prisma.interviewBooking.findMany({
    where: {
      date: dateStr,
      status: {
        notIn: ["CANCELLED", "RESCHEDULED"],
      },
    },
    select: {
      timeSlot: true,
      candidate: {
        select: {
          name: true,
        },
      },
    },
  });

  const bookedSlotLabels = new Set(bookedOnDate.map((b) => b.timeSlot));

  return allSlots.map((slot) => ({
    ...slot,
    isAvailable: !bookedSlotLabels.has(slot.label),
  }));
}

