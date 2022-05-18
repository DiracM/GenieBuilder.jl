module GenieBuilder

using Genie, Logging, LoggingExtras

function main()
  Core.eval(Main, :(const UserApp = $(@__MODULE__)))

  Genie.genie(; context = @__MODULE__)

  Core.eval(Main, :(const Genie = UserApp.Genie))
  Core.eval(Main, :(using Genie))
end

function go()
  cd(normpath(@__DIR__, ".."))
  Genie.go()
  try
    @eval Genie.up(; async = false)
  catch ex
    @error ex
    stop()
  finally
    stop()
  end
end

function postinstall()
  GBDIR = pwd()

  @show GBDIR

  APPS_FOLDER = joinpath(GBDIR, "apps")
  DB_FOLDER = joinpath(GBDIR, "db")
  DB_NAME = "client.sqlite3"
  DB_CONFIG_FILE = "connection.yml"

  cd(normpath(joinpath(@__DIR__, "..")))
  Genie.Generator.write_secrets_file()

  dbpath = normpath(joinpath(".", "db"))
  ispath(dbpath) ? chmod(dbpath, 0o775; recursive = true) : @warn("db path $dbpath does not exist")

  isdir(DB_FOLDER) || mkdir(DB_FOLDER)
  cp(joinpath(dbpath, DB_NAME), joinpath(DB_FOLDER, DB_NAME))
  open(joinpath(DB_FOLDER, DB_CONFIG_FILE), "w") do io
    write(io, """
      env: ENV["GENIE_ENV"]

      dev:
        adapter:  SQLite
        database: $DB_FOLDER/client.sqlite3
        config:
    """)
  end
end

function stop()
  Genie.Server.down!()
  Base.exit()
end

end
