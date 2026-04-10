"""
Holiday Calendar Checker
Validates meeting dates against configured public holidays
"""

import json
import os
from datetime import datetime, date
from pathlib import Path
from typing import Optional, Dict, List, Tuple

class HolidayChecker:
    def __init__(self, config_path: str = None):
        """Initialize Holiday Checker with configuration file"""
        if config_path is None:
            # Default path
            config_path = os.path.join(
                os.path.dirname(__file__), 
                '..', 
                'config', 
                'holiday_calendar.json'
            )
        
        self.config_path = config_path
        self.config = self._load_config()
        self.active_country = self.config.get('active_country', 'USA')
        self.enforcement_enabled = self.config.get('holiday_enforcement_enabled', True)
    
    def _load_config(self) -> dict:
        """Load holiday calendar configuration from JSON file"""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Warning: Holiday calendar config not found at {self.config_path}")
            return {"countries": {}, "active_country": "USA"}
        except json.JSONDecodeError as e:
            print(f"Error parsing holiday calendar config: {e}")
            return {"countries": {}, "active_country": "USA"}
    
    def reload_config(self):
        """Reload configuration from file (useful after updates)"""
        self.config = self._load_config()
        self.active_country = self.config.get('active_country', 'USA')
        self.enforcement_enabled = self.config.get('holiday_enforcement_enabled', True)
    
    def is_enforcement_enabled(self) -> bool:
        """Check if holiday enforcement is enabled"""
        return self.enforcement_enabled
    
    def set_enforcement_enabled(self, enabled: bool) -> bool:
        """Enable or disable holiday enforcement"""
        try:
            import json
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            
            config['holiday_enforcement_enabled'] = enabled
            
            with open(self.config_path, 'w') as f:
                json.dump(config, f, indent=2)
            
            self.reload_config()
            return True
        except Exception as e:
            print(f"Error setting enforcement: {e}")
            return False
    
    def set_active_country(self, country_code: str) -> bool:
        """Change the active country for holiday checking"""
        if country_code in self.config.get('countries', {}):
            self.active_country = country_code
            return True
        return False
    
    def get_available_countries(self) -> List[str]:
        """Get list of available country codes"""
        return list(self.config.get('countries', {}).keys())
    
    def get_country_info(self, country_code: str = None) -> Dict:
        """Get information about a country's holidays"""
        if country_code is None:
            country_code = self.active_country
        
        countries = self.config.get('countries', {})
        return countries.get(country_code, {})
    
    def is_holiday(self, check_date: date, country_code: str = None) -> Tuple[bool, Optional[Dict]]:
        """
        Check if a given date is a holiday
        
        Args:
            check_date: Date to check
            country_code: Country code (uses active_country if None)
        
        Returns:
            Tuple of (is_holiday: bool, holiday_info: dict or None)
        """
        if country_code is None:
            country_code = self.active_country
        
        # Get country data
        country_data = self.get_country_info(country_code)
        if not country_data:
            return False, None
        
        # Get year and holidays
        year = str(check_date.year)
        holidays = country_data.get('holidays', {}).get(year, [])
        
        # Convert date to string for comparison
        date_str = check_date.strftime('%Y-%m-%d')
        
        # Check both actual date and observed date
        for holiday in holidays:
            if holiday.get('date') == date_str or holiday.get('observed') == date_str:
                return True, holiday
        
        return False, None
    
    def get_holidays_in_range(
        self, 
        start_date: date, 
        end_date: date, 
        country_code: str = None
    ) -> List[Dict]:
        """
        Get all holidays in a date range
        
        Args:
            start_date: Start of range
            end_date: End of range
            country_code: Country code (uses active_country if None)
        
        Returns:
            List of holiday dictionaries
        """
        if country_code is None:
            country_code = self.active_country
        
        country_data = self.get_country_info(country_code)
        if not country_data:
            return []
        
        holidays_in_range = []
        
        # Check all years in range
        for year in range(start_date.year, end_date.year + 1):
            year_str = str(year)
            holidays = country_data.get('holidays', {}).get(year_str, [])
            
            for holiday in holidays:
                # Check observed date first, then actual date
                holiday_date_str = holiday.get('observed') or holiday.get('date')
                if not holiday_date_str:
                    continue
                
                try:
                    holiday_date = datetime.strptime(holiday_date_str, '%Y-%m-%d').date()
                    if start_date <= holiday_date <= end_date:
                        holidays_in_range.append(holiday)
                except ValueError:
                    continue
        
        return holidays_in_range
    
    def get_upcoming_holidays(self, days: int = 30, country_code: str = None) -> List[Dict]:
        """
        Get holidays in the next N days
        
        Args:
            days: Number of days to look ahead
            country_code: Country code (uses active_country if None)
        
        Returns:
            List of holiday dictionaries
        """
        from datetime import timedelta
        
        today = date.today()
        end_date = today + timedelta(days=days)
        
        return self.get_holidays_in_range(today, end_date, country_code)
    
    def validate_meeting_date(self, meeting_date: date, country_code: str = None) -> Dict:
        """
        Validate if a meeting can be scheduled on given date
        
        Args:
            meeting_date: Proposed meeting date
            country_code: Country code (uses active_country if None)
        
        Returns:
            Dictionary with validation result:
            {
                'valid': bool,
                'is_holiday': bool,
                'holiday_name': str or None,
                'message': str,
                'holiday_info': dict or None,
                'enforcement_enabled': bool
            }
        """
        # If enforcement is disabled, always return valid
        if not self.enforcement_enabled:
            return {
                'valid': True,
                'is_holiday': False,
                'holiday_name': None,
                'message': 'Meeting date is available (Holiday enforcement disabled)',
                'holiday_info': None,
                'country': country_code or self.active_country,
                'enforcement_enabled': False
            }
        
        is_holiday, holiday_info = self.is_holiday(meeting_date, country_code)
        
        if is_holiday:
            holiday_name = holiday_info.get('name', 'Public Holiday')
            note = holiday_info.get('note', '')
            
            message = f"Cannot schedule meeting on {holiday_name}"
            if note:
                message += f" ({note})"
            
            return {
                'valid': False,
                'is_holiday': True,
                'holiday_name': holiday_name,
                'message': message,
                'holiday_info': holiday_info,
                'country': country_code or self.active_country,
                'enforcement_enabled': True
            }
        
        return {
            'valid': True,
            'is_holiday': False,
            'holiday_name': None,
            'message': 'Meeting date is available',
            'holiday_info': None,
            'country': country_code or self.active_country,
            'enforcement_enabled': True
        }


# Global instance
_holiday_checker = None

def get_holiday_checker() -> HolidayChecker:
    """Get global holiday checker instance"""
    global _holiday_checker
    if _holiday_checker is None:
        _holiday_checker = HolidayChecker()
    return _holiday_checker


# Convenience functions
def is_holiday(check_date: date, country_code: str = None) -> bool:
    """Quick check if date is a holiday"""
    checker = get_holiday_checker()
    is_hol, _ = checker.is_holiday(check_date, country_code)
    return is_hol


def validate_meeting_date(meeting_date: date, country_code: str = None) -> Dict:
    """Validate meeting date"""
    checker = get_holiday_checker()
    return checker.validate_meeting_date(meeting_date, country_code)


def get_upcoming_holidays(days: int = 30) -> List[Dict]:
    """Get upcoming holidays"""
    checker = get_holiday_checker()
    return checker.get_upcoming_holidays(days)


if __name__ == "__main__":
    # Test the holiday checker
    print("Testing Holiday Checker\n")
    
    checker = HolidayChecker()
    print(f"Active Country: {checker.active_country}")
    print(f"Available Countries: {checker.get_available_countries()}\n")
    
    # Test specific dates
    test_dates = [
        date(2026, 1, 1),   # New Year's Day
        date(2026, 7, 4),   # Independence Day
        date(2026, 12, 25), # Christmas
        date(2026, 3, 15),  # Regular day
    ]
    
    for test_date in test_dates:
        result = checker.validate_meeting_date(test_date)
        status = "❌ HOLIDAY" if not result['valid'] else "✅ Available"
        print(f"{test_date}: {status}")
        if result['is_holiday']:
            print(f"   Holiday: {result['holiday_name']}")
        print()
    
    # Test upcoming holidays
    print("\nUpcoming Holidays (next 90 days):")
    upcoming = checker.get_upcoming_holidays(90)
    for holiday in upcoming:
        print(f"  - {holiday['observed']}: {holiday['name']}")
