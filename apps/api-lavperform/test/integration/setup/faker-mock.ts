let counter = 0;
export const faker = {
  person: { fullName: () => `Test Name ${++counter}` },
  phone: { number: () => `+55119${String(++counter).padStart(8, '0')}` },
  internet: { email: () => `test${++counter}@test.com` },
  date: { 
    past: () => new Date(Date.now() - 1000000), 
    future: () => new Date(Date.now() + 1000000) 
  },
  commerce: { productName: () => `Product ${++counter}` },
  lorem: { paragraph: () => `Test Lorem paragraph ${++counter}` },
  image: { url: () => `http://example.com/image${++counter}.jpg` },
  helpers: { 
    fromRegExp: (re: string) => `+55119${String(++counter).padStart(8, '0')}`,
    replaceSymbolWithNumber: (s: string) => `+55119${String(++counter).padStart(8, '0')}`
  },
  number: {
    int: (opts: any) => ++counter
  },
  company: {
    name: () => `Company ${++counter}`
  },
  string: {
    uuid: () => `uuid-${++counter}`
  }
};
