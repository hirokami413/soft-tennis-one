import re
import sys

def process(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add imports
    if 'useSupabaseTeamFeatures' not in content:
        import_str = "import { useSupabaseTeams } from '../hooks/useSupabaseTeams';\nimport { useSupabaseTeamFeatures } from '../hooks/useSupabaseTeamFeatures';\n"
        content = content.replace("import { Layout } from", import_str + "import { Layout } from")

    # Replace dummy constants
    dummy_pattern = re.compile(r"// ── Dummy Data ──.*?// ── Component ──", re.DOTALL)
    
    component_start = """// ── Component ──
export const TeamView: React.FC = () => {
  const { user } = useAuth();
  const { teams: dbTeams, createTeam, joinTeam } = useSupabaseTeams();
"""
    content = dummy_pattern.sub(component_start, content)
    
    # Replace initial state of teams
    teams_state_pattern = re.compile(r"const \[teams, setTeams\] = useState<Team\[\]>\(\(\) => \{.+?\}\);", re.DOTALL)
    
    new_teams_state = """const [teams, setTeams] = useState<Team[]>([]);
  
  useEffect(() => {
    if (dbTeams && dbTeams.length > 0) {
      setTeams(dbTeams.map(t => ({
        id: t.id,
        name: t.name,
        inviteCode: t.code,
        members: [{name: 'メンバー', role: 'member', avatar: 'M'}], // Simplified for demo
        events: [],
        chats: [],
        groups: [],
        boardPosts: []
      })));
    } else {
      setTeams([]);
    }
  }, [dbTeams]);"""
    
    content = teams_state_pattern.sub(new_teams_state, content)
    
    # Hook into current team features
    current_team_def = """const currentTeam = teams.find(t => t.id === currentTeamId) || teams[0];"""
    
    new_current_team_def = """const currentTeam = teams.find(t => t.id === currentTeamId) || teams[0];
  
  const { 
    chats: dbChats, 
    events: dbEvents, 
    boardPosts: dbBoards, 
    sendChat, 
    addEvent, 
    updateAttendance, 
    addBoardPost 
  } = useSupabaseTeamFeatures(currentTeam?.id);"""
    
    content = content.replace(current_team_def, new_current_team_def)
    
    # Override derived states
    derived_pattern = """const members = currentTeam.members || [];
  const events = currentTeam.events || [];
  const chats = currentTeam.chats || [];
  const groups = currentTeam.groups || [];
  const boardPosts = currentTeam.boardPosts || [];"""
    
    if "const boardPosts = currentTeam.boardPosts || [];" not in content:
        # Sometimes boardPosts isn't unpacked like this, let's just do an easier replace
        content = content.replace("const events = currentTeam.events || [];", "const events = dbEvents.length > 0 ? dbEvents : [];")
        content = content.replace("const chats = currentTeam.chats || [];", "const chats = dbChats.length > 0 ? dbChats : [];")
    else:
        content = content.replace(derived_pattern, """const members = currentTeam.members || [];
  const events = dbEvents;
  const chats = dbChats;
  const groups = currentTeam.groups || [];
  const boardPosts = dbBoards;""")
        
    # We will override the submit methods instead of changing the whole file. 
    # Just redirect the state mutations to the hook.
    content = content.replace("setTeams(prev => prev.map(t => t.id === currentTeamId ? { ...t, boardPosts: [newPost, ...(t.boardPosts || [])] } : t));",
                              "addBoardPost(newPostTitle, newPostContent);")
                              
    content = content.replace("setTeams(prev => prev.map(t => t.id === currentTeamId ? { ...t, chats: [...t.chats, newMsg] } : t));",
                              "sendChat(chatInput, chatTarget);")
                              
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

process(r'd:\antigravity練習\ソフトテニス練習メニュー一覧\src\views\TeamView.tsx')
