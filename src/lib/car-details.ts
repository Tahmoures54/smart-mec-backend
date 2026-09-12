import carsData from '@/data/cars.json';
import { BadRequestError } from '@/lib/error-handler';
import { Car } from '@/types';

export function buildCarDetails(
  carId: string,
  year: string,
  customCarName: string | null
): string {
  if (carId === 'custom') {
    if (!customCarName) {
      throw new BadRequestError('برای خودرو خارج از لیست، نام خودرو الزامی است.');
    }
    return `نام خودرو (واردشده توسط کاربر): ${customCarName}\nسال ساخت: ${year}`;
  }

  const carsList = carsData as Car[];
  const car = carsList.find((c) => c.id.toString() === carId);
  if (!car) {
    throw new BadRequestError('خودروی انتخاب شده در سیستم نامعتبر است.');
  }

  const issues = Array.isArray(car.commonIssues)
    ? car.commonIssues.join('، ')
    : car.commonIssues ?? 'نامشخص';

  return `برند: ${car.brand}\nمدل: ${car.model}\nسال ساخت (اعلام کاربر): ${year}\nموتور: ${car.engine}\nگیربکس: ${car.gearbox ?? 'نامشخص'}\nمشکلات شایع: ${issues}`;
}

export function storedCarId(
  carId: string,
  year: string,
  customCarName: string | null
): string {
  return carId === 'custom' ? `custom:${customCarName}:${year}` : `${carId}:${year}`;
}
