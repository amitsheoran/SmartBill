export function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  // Ensure absolute integer value
  let amt = Math.round(num);

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 200 || n >= 20) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    
    if (n > 0) {
      str += a[n] + ' ';
    }
    
    return str.trim();
  }

  let words = '';
  
  // Crores
  if (Math.floor(amt / 10000000) > 0) {
    words += convertLessThanThousand(Math.floor(amt / 10000000)) + ' Crore ';
    amt %= 10000000;
  }
  
  // Lakhs
  if (Math.floor(amt / 100000) > 0) {
    words += convertLessThanThousand(Math.floor(amt / 100000)) + ' Lakh ';
    amt %= 100000;
  }
  
  // Thousands
  if (Math.floor(amt / 1000) > 0) {
    words += convertLessThanThousand(Math.floor(amt / 1000)) + ' Thousand ';
    amt %= 1000;
  }
  
  // Hundreds/Tens/Ones
  if (amt > 0) {
    words += convertLessThanThousand(amt);
  }

  return `Rupees ${words.trim()} Only`;
}
