export type WebsiteLink = {id: string; title: string; url: string};

export const websiteLinks: readonly WebsiteLink[] = [
  {id:'liangju',title:'量居-家具定制',url:'https://www.liangjux.com'},
  {id:'inventory',title:'进销存',url:'https://www.iosbuy.com'},
  {id:'support',title:'客服',url:'https://www.iosbuy.com/bbss/liuyan.html'},
];

export type WebsiteDialogProps = {site: WebsiteLink | null; onClose: () => void};
