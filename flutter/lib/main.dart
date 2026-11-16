import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'chess/game_controller.dart';
import 'chess/position.dart';
import 'ui/chess_board.dart';

void main() { WidgetsFlutterBinding.ensureInitialized();runApp(const ChessApp()); }
const _cream=Color(0xfff4e6cd),_ink=Color(0xff563d2c),_red=Color(0xff8d432d),_gold=Color(0xffffdf9c);
class ChessApp extends StatelessWidget {
  const ChessApp({super.key});
  @override
  Widget build(BuildContext context)=>MaterialApp(
    debugShowCheckedModeBanner:false,title:'弈 · 中国象棋',
    theme:ThemeData(useMaterial3:true,colorScheme:ColorScheme.fromSeed(seedColor:_red,surface:_cream),
      scaffoldBackgroundColor:const Color(0xff634329),
      textTheme:const TextTheme(bodyMedium:TextStyle(color:_ink))),
    home:const ChessPage());
}
class ChessPage extends StatefulWidget {
  const ChessPage({super.key});
  @override
  State<ChessPage> createState()=>_ChessPageState();
}
class _ChessPageState extends State<ChessPage> {
  final game=GameController();
  @override
  void initState() { super.initState();WidgetsBinding.instance.addPostFrameCallback((_) { if (mounted) { unawaited(game.start()); } }); }
  @override
  void dispose() { game.dispose();super.dispose(); }
  Future<void> _open(String url) async {
    try {
      if (await launchUrl(Uri.parse(url),mode:LaunchMode.externalApplication)) { return; }
    } catch (_) { /* Show an actionable UI error below. */ }
    if (mounted) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('无法打开系统浏览器，请检查默认浏览器设置。'))); }
  }
  void _rules()=>showDialog<void>(context:context,builder:(context)=>AlertDialog(
    title:const Text('本场说明'),content:const Text('红先黑后，轮流行棋。\n\n落子后 AI 自动分析当前局面，以箭头提示下一方。\n\nAI 在设备本地运行，默认思考 1 秒；人机模式由你执红。\n\n暂未加入联网、计时和长将长捉裁定。'),
    actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('开始对弈'))]));
  void _fen()=>showDialog<void>(context:context,builder:(context)=>AlertDialog(title:const Text('当前局面'),
    content:SelectableText(game.position.fen),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('关闭')),
      TextButton(onPressed:() async { await Clipboard.setData(ClipboardData(text:game.position.fen));if (context.mounted) { Navigator.pop(context); } },child:const Text('复制 FEN'))]));
  @override
  Widget build(BuildContext context)=>Scaffold(body:DecoratedBox(
    decoration:const BoxDecoration(image:DecorationImage(image:AssetImage('assets/chess/table.png'),fit:BoxFit.cover)),
    child:SafeArea(child:AnimatedBuilder(animation:game,builder:(context,_)=>LayoutBuilder(builder:(context,box) {
      final wide=box.maxWidth>=1020;
      final boardWidth=wide ? (box.maxWidth-430).clamp(300.0,660.0) : (box.maxWidth-32).clamp(220.0,660.0);
      final top=game.flipped ? Side.red : Side.black;
      final board=SizedBox(width:boardWidth,child:Column(children:[_player(top),ChessBoard(game:game),_player(top.opposite)]));
      return SingleChildScrollView(padding:const EdgeInsets.symmetric(horizontal:16,vertical:24),child:Center(child:ConstrainedBox(
        constraints:const BoxConstraints(maxWidth:1040),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
          Row(children:[ClipRRect(borderRadius:BorderRadius.circular(12),child:Image.asset('assets/app-icon/app-icon-1024.png',width:48,height:48)),
            const SizedBox(width:12),const Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
              Text('弈 · 中国象棋',style:TextStyle(fontSize:26,fontWeight:FontWeight.bold,color:_gold)),
              Text('一枰山河，落子有道',style:TextStyle(color:Color(0xffd4b58d),fontSize:12,letterSpacing:3)),
            ])),TextButton(onPressed:_rules,child:const Text('本场说明',style:TextStyle(color:_gold)))]),
          const SizedBox(height:18),Wrap(spacing:10,runSpacing:8,children:[
            _link('量居-家具定制','https://www.liangjux.com'),_link('进销存','https://www.iosbuy.com'),_link('客服','https://www.iosbuy.com/bbss/liuyan.html'),
          ]),const SizedBox(height:22),
          if (wide) Row(crossAxisAlignment:CrossAxisAlignment.center,children:[Expanded(child:Center(child:board)),const SizedBox(width:24),SizedBox(width:320,child:_panel())])
          else Column(children:[board,const SizedBox(height:20),ConstrainedBox(constraints:const BoxConstraints(maxWidth:660),child:_panel())]),
        ]))));
    })))));
  Widget _link(String label,String url)=>OutlinedButton(style:OutlinedButton.styleFrom(foregroundColor:_gold,side:const BorderSide(color:Color(0xffab8657)),shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(12))),onPressed:()=>_open(url),child:Text(label));
  Widget _player(Side side)=>Padding(padding:const EdgeInsets.symmetric(horizontal:10,vertical:12),child:Row(mainAxisAlignment:MainAxisAlignment.spaceBetween,children:[
    Text('● ${side.label}',style:TextStyle(color:side==Side.red ? const Color(0xfff4bf8d) : _cream,fontSize:16,fontWeight:FontWeight.w600)),
    Text(side==Side.red ? '执红先行' : game.computer ? '电脑棋手' : '对弈棋手',style:const TextStyle(color:Color(0xffd6ba97),fontSize:12)),
  ]));
  Widget _panel() {
    final title=game.ended ? '${game.position.turn.opposite.label}胜出' : '${game.position.turn.label}${game.checked ? '被将军' : '行棋'}';
    final hint=game.hint;
    return Container(width:double.infinity,padding:const EdgeInsets.all(22),decoration:BoxDecoration(color:_cream,borderRadius:BorderRadius.circular(18),border:Border.all(color:const Color(0xffc8a476),width:2)),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      const Text('局 势 洞 察',style:TextStyle(color:Color(0xff8b6848),letterSpacing:4,fontSize:12)),const SizedBox(height:12),
      Text(title,style:const TextStyle(fontSize:28,fontWeight:FontWeight.bold,color:_ink)),const SizedBox(height:6),
      Text(game.computer ? '人机对弈 · 你执红先行' : '双人对弈 · 红先黑后',style:const TextStyle(color:Color(0xff80684e))),const Divider(height:36,color:Color(0xffd7be98)),
      Row(children:[const Icon(Icons.offline_bolt_outlined,size:19,color:_red),const SizedBox(width:7),const Expanded(child:Text('AI库 · 设备本地计算')),
        if (game.thinking) const SizedBox(width:16,height:16,child:CircularProgressIndicator(strokeWidth:2))]),const SizedBox(height:16),
      Text(game.thinking ? '正在推演下一步…' : '建议走法',style:const TextStyle(color:Color(0xff796044))),const SizedBox(height:10),
      Text(hint!=null ? game.position.describe(hint) : game.ended ? '本局结束' : '准备分析',style:const TextStyle(fontSize:20,fontWeight:FontWeight.w600,color:_red)),
      if (game.message.isNotEmpty) Padding(padding:const EdgeInsets.only(top:14),child:Text(game.message,style:const TextStyle(color:_red,height:1.6))),
      const SizedBox(height:18),FilledButton(style:FilledButton.styleFrom(backgroundColor:_red,foregroundColor:_gold,padding:const EdgeInsets.symmetric(vertical:15)),
        onPressed:game.thinking || hint==null || game.ended || (game.computer && game.position.turn==Side.black) ? null : ()=>game.play(hint),child:Text(game.thinking ? '思考中…' : '走建议一步')),
      const SizedBox(height:10),Row(children:[Expanded(child:OutlinedButton(onPressed:game.ply>0 ? game.undo : null,child:const Text('悔棋'))),const SizedBox(width:10),Expanded(child:OutlinedButton(onPressed:()=>_restart(),child:const Text('重新开局')))]),
      TextButton.icon(onPressed:game.flip,icon:const Icon(Icons.swap_vert),label:Text('翻转棋盘 · ${game.flipped ? '黑方' : '红方'}在下')),
      TextButton(onPressed:game.toggleComputer,child:Text('模式：${game.computer ? '人机对弈' : '双人对弈'} ⇄')),
      TextButton(onPressed:game.thinking || game.ended ? null : ()=>game.analyze(),child:const Text('重新分析当前局面')),
      TextButton(onPressed:_fen,child:const Text('局面代码')),
      Text('第 ${game.ply} 手 · 点选棋子查看合法落点。',style:const TextStyle(color:Color(0xff8a735a),fontSize:12,height:1.7)),
    ]));
  }
  Future<void> _restart() async {
    final yes=await showDialog<bool>(context:context,builder:(context)=>AlertDialog(title:const Text('重新开局'),content:const Text('将清空当前棋局。'),actions:[TextButton(onPressed:()=>Navigator.pop(context,false),child:const Text('取消')),FilledButton(onPressed:()=>Navigator.pop(context,true),child:const Text('重新开局'))]));
    if (yes==true && mounted) { game.reset(); }
  }
}
