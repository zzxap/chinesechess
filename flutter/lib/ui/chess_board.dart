import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../chess/game_controller.dart';
import '../chess/position.dart';

const _teal=Color(0xff367f73);
class ChessBoard extends StatelessWidget {
  const ChessBoard({super.key,required this.game});
  final GameController game;
  @override
  Widget build(BuildContext context) => AspectRatio(aspectRatio:952/1052,child:LayoutBuilder(builder:(context,box) {
    final scale=box.maxWidth/952,cell=100*scale;
    Offset point(int index) {
      final visible=game.flipped ? 89-index : index;
      return Offset((76+visible%9*100)*scale,(76+visible~/9*100)*scale);
    }
    return Stack(clipBehavior:Clip.none,children:[
      Positioned.fill(child:Image.asset('assets/chess/board.png',fit:BoxFit.fill)),
      Positioned.fill(child:CustomPaint(painter:_Guides(game,point,cell))),
      for (var i=0;i<90;i++) Positioned(left:point(i).dx-cell/2,top:point(i).dy-cell/2,width:cell,height:cell,
        child:Semantics(button:true,selected:game.selected==i,
          label:'${game.position.board[i]?.side.label ?? ''}${game.position.board[i]?.label ?? '空位'}，${i%9+1}列${i~/9+1}行',
          child:GestureDetector(behavior:HitTestBehavior.opaque,onTap:()=>game.select(i),child:Stack(clipBehavior:Clip.none,children:[
            if (game.selected==i) Positioned.fill(child:Container(margin:EdgeInsets.all(cell*.04),decoration:BoxDecoration(shape:BoxShape.circle,border:Border.all(color:_teal,width:3)))),
            if (game.position.board[i] case final Piece piece) Positioned(left:-cell*.04,top:-cell*.02,width:cell*1.08,height:cell*1.134,
              child:IgnorePointer(child:Image.asset(piece.asset,fit:BoxFit.fill))),
          ])))),
    ]);
  }));
}
class _Guides extends CustomPainter {
  _Guides(this.game,this.point,this.cell);
  final GameController game;
  final Offset Function(int) point;
  final double cell;
  @override
  void paint(Canvas canvas,Size size) {
    final last=game.position.last;
    if (last!=null) {
      final paint=Paint()..color=const Color(0x65fff0a9);
      canvas.drawCircle(point(last.from),cell*.37,paint);
      canvas.drawCircle(point(last.to),cell*.45,Paint()..color=const Color(0xffb88742)..style=PaintingStyle.stroke..strokeWidth=2);
    }
    for (final target in game.targets) {
      final occupied=game.position.board[target]!=null;
      canvas.drawCircle(point(target),cell*(occupied ? .39 : .105),Paint()..color=_teal.withValues(alpha:.75)..style=(occupied ? PaintingStyle.stroke : PaintingStyle.fill)..strokeWidth=3);
    }
    final hint=game.hint;
    if (hint==null) { return; }
    final start=point(hint.from),end=point(hint.to),delta=end-start;
    if (delta.distance<1) { return; }
    final unit=delta/delta.distance;
    final a=start+unit*cell*.16,b=end-unit*cell*.18;
    final paint=Paint()..color=_teal..strokeWidth=math.max(3,cell*.065)..strokeCap=StrokeCap.round;
    canvas.drawLine(a,b,paint);
    final normal=Offset(-unit.dy,unit.dx),base=b-unit*cell*.22;
    canvas.drawPath(Path()..moveTo(b.dx,b.dy)..lineTo((base+normal*cell*.13).dx,(base+normal*cell*.13).dy)..lineTo((base-normal*cell*.13).dx,(base-normal*cell*.13).dy)..close(),Paint()..color=_teal);
  }
  @override
  bool shouldRepaint(covariant _Guides oldDelegate)=>true;
}
