declare module "read-excel-file/browser" {
  export default function readXlsxFile(file: File): Promise<unknown[][]>;
}
